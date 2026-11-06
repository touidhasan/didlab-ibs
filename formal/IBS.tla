-------------------------------- MODULE IBS --------------------------------
(***************************************************************************)
(* Intent-bound signing (IBS): an abstract model for the TLC model checker. *)
(*                                                                         *)
(* One hot wallet; values in budget units; one step of time is one block. *)
(* The attacker controls the request builder (service S). It can ask the   *)
(* signer for any transaction or EIP-7702 authorization, with any intent   *)
(* id, including one the intent authority never issued. That models a      *)
(* forged intent: signature unforgeability (assumption A-sig) is           *)
(* abstracted as membership in the authority's ledger. The attacker may    *)
(* hold a signature unsent and broadcast it later (attacker A10).          *)
(*                                                                         *)
(* Modelling assumptions (see formal/README.md):                           *)
(*   - funds are unlimited, so a broadcast transaction with the next nonce *)
(*     always executes before its block ends; queues of underfunded        *)
(*     transactions (limitation E8, attackers A3r and A9) are covered by   *)
(*     the simulator, not by this model;                                   *)
(*   - legitimate traffic is at most one withdrawal of 1 unit per block,   *)
(*     with a fresh intent, sent at once (ASSUME T <= B keeps it in budget).*)
(*                                                                         *)
(* Properties T1-T7 are those of docs/RESEARCH_FRAMING.md section 6.       *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS
    Semantic,       \* C2+C3: decision rule at the signer (type, nonce window, cap, budget)
    Intents,        \* C1: every transaction needs a fresh intent whose fields match exactly
    Watcher,        \* C4: alarms and unexplained outflows freeze the signer at the end of the block
    Tiered,         \* soft alerts (EIP-7702 request, missing intent) do not freeze (configuration R4t)
    Attacker,       \* the attacker controls the request builder
    IACompromised,  \* the attacker can also have the intent authority sign intents (attacker A4)
    B, T,           \* budget per sliding window of T blocks
    Cap, Nu,        \* per-transaction cap, nonce window
    H,              \* last block of the horizon
    MaxOps,         \* attacker signing requests per block (bounds the state space)
    MaxV,           \* value of the attacker's over-cap request (MaxV > Cap tests rule 5)
    Sweep           \* value drained per block through delegated code

ASSUME /\ B \in Nat /\ T \in Nat \ {0} /\ Cap \in Nat \ {0} /\ Nu \in Nat \ {0}
       /\ H \in Nat /\ MaxOps \in Nat /\ MaxV \in Nat /\ Sweep \in Nat
       /\ T <= B   \* legitimate traffic (at most 1 unit per block) fits in every window

Hub == "hub"      \* the attacker's destination
User == "user"    \* a customer's destination
NoIntent == 0
Forged == 999     \* an intent id the intent authority never issued

VARIABLES
    t,            \* current block
    ops,          \* attacker signing requests made in this block
    userDone,     \* this block's legitimate withdrawal has been requested
    swept,        \* delegated code was used to drain in this block
    frozen,       \* the signer refuses everything
    alarm,        \* an alert was raised in this block (containment at its end)
    unexplained,  \* an outflow without a matching intent executed in this block
    ledger,       \* intents the authority signed: set of [id, to, v, src]
    used,         \* intent ids already consumed by a signature
    signed,       \* signatures given: set of [k, kind, n, to, v, id, b, src]; k is a serial number
    bcast,        \* serial numbers of signed transactions that have been broadcast
    executed,     \* serial numbers of signatures executed, or invalidated (nonce used, authorization revoked)
    mined,        \* next nonce the chain executes
    delegated,    \* an EIP-7702 delegation is in force at the treasury
    loss,         \* value moved to the attacker
    refusals      \* reasons for which a legitimate request was refused

vars == << t, ops, userDone, swept, frozen, alarm, unexplained, ledger, used, signed, bcast,
           executed, mined, delegated, loss, refusals >>

----------------------------------------------------------------------------
RECURSIVE SumV(_)
SumV(S) == IF S = {} THEN 0 ELSE LET x == CHOOSE x \in S : TRUE IN x.v + SumV(S \ {x})

RECURSIVE FirstFree(_, _)
FirstFree(m, S) == IF m \in S THEN FirstFree(m + 1, S) ELSE m

\* The pending nonce, as a node reports it: the mined count plus the broadcast, unexecuted transactions that
\* follow it without a gap. Signatures held unsent do not advance it.
Inflight == {s.n : s \in {x \in signed : x.kind = "tx" /\ x.k \in bcast /\ x.k \notin executed}}
Pending == FirstFree(mined, Inflight)

\* Value of transactions signed in the window of T blocks that ends at block b.
WindowAt(b) == SumV({s \in signed : s.kind = "tx" /\ s.b + T > b /\ s.b <= b})

\* An intent in ledger L authorizes exactly this destination and value.
Matches(L, r) == \E i \in L : i.id = r.id /\ i.to = r.to /\ i.v = r.v

Allow == [ok |-> TRUE, why |-> "", alert |-> FALSE, soft |-> FALSE]
Refuse(why, alert, soft) == [ok |-> FALSE, why |-> why, alert |-> alert, soft |-> soft]

\* The signer's decision rule (docs/RESEARCH_FRAMING.md section 5), in the simulator's order.
Decide(r, L) ==
    IF frozen THEN Refuse("frozen", FALSE, FALSE)
    ELSE IF ~Semantic THEN Allow
    ELSE IF r.kind = "auth" THEN Refuse("type", TRUE, TRUE)
    ELSE IF r.n < Pending \/ r.n >= Pending + Nu THEN Refuse("nonce", FALSE, FALSE)
    ELSE IF r.v > Cap THEN Refuse("cap", FALSE, FALSE)
    ELSE IF WindowAt(t) + r.v > B THEN Refuse("velocity", TRUE, FALSE)
    ELSE IF Intents /\ r.id = NoIntent THEN Refuse("no-intent", TRUE, TRUE)
    ELSE IF Intents /\ (r.id \in used \/ ~Matches(L, r)) THEN Refuse("intent", TRUE, FALSE)
    ELSE Allow

\* Ask the signer. A signature is recorded and, if sendNow, broadcast at once.
Ask(r, L, sendNow) ==
    LET d == Decide(r, L)
        s == [k |-> Cardinality(signed) + 1, kind |-> r.kind, n |-> r.n, to |-> r.to, v |-> r.v,
              id |-> r.id, b |-> t, src |-> r.src]
    IN /\ alarm' = (alarm \/ (Watcher /\ d.alert /\ ~(Tiered /\ d.soft)))
       /\ IF d.ok
            THEN /\ signed' = signed \cup {s}
                 /\ used' = IF Semantic /\ Intents THEN used \cup {r.id} ELSE used
                 /\ bcast' = IF sendNow THEN bcast \cup {s.k} ELSE bcast
                 /\ refusals' = refusals
            ELSE /\ UNCHANGED << signed, used, bcast >>
                 /\ refusals' = IF r.src = "user" THEN refusals \cup {d.why} ELSE refusals

----------------------------------------------------------------------------
Init ==
    /\ t = 0 /\ ops = 0 /\ userDone = FALSE /\ swept = FALSE
    /\ frozen = FALSE /\ alarm = FALSE /\ unexplained = FALSE
    /\ ledger = {} /\ used = {} /\ signed = {} /\ bcast = {} /\ executed = {}
    /\ mined = 0 /\ delegated = FALSE /\ loss = 0 /\ refusals = {}

\* A customer's withdrawal: the authority signs an intent, the pipeline asks the signer and broadcasts.
UserWithdrawal ==
    /\ t <= H /\ ~userDone
    /\ LET i == [id |-> Cardinality(ledger) + 1, to |-> User, v |-> 1, src |-> "user"]
           r == [kind |-> "tx", n |-> Pending, to |-> User, v |-> 1, id |-> i.id, src |-> "user"]
       IN /\ ledger' = ledger \cup {i}
          /\ Ask(r, ledger \cup {i}, TRUE)
    /\ userDone' = TRUE
    /\ UNCHANGED << t, ops, swept, frozen, unexplained, executed, mined, delegated, loss >>

\* Attacker A4: the compromised intent authority signs an intent for the attacker.
AttackerIntent ==
    /\ Attacker /\ IACompromised /\ t <= H /\ ops < MaxOps
    /\ ledger' = ledger \cup {[id |-> Cardinality(ledger) + 1, to |-> Hub, v |-> Cap, src |-> "attacker"]}
    /\ ops' = ops + 1
    /\ UNCHANGED << t, userDone, swept, frozen, alarm, unexplained, used, signed, bcast, executed,
                    mined, delegated, loss, refusals >>

\* Intent ids the attacker presents: its own (A4), none, forged, and one customer's (replay or mismatch).
UserIds == {i.id : i \in {j \in ledger : j.src = "user"}}
AttackerIds == {i.id : i \in {j \in ledger : j.src = "attacker"}} \cup {NoIntent, Forged}
               \cup (IF UserIds = {} THEN {} ELSE {CHOOSE x \in UserIds : TRUE})
\* Nonces the attacker asks for: the window's edges on both sides, and inside it.
NonceChoices == {Pending, Pending + 1, Pending + Nu} \cup (IF Pending > 0 THEN {Pending - 1} ELSE {})

\* The attacker asks for a signature and holds it (it may broadcast it later).
AttackerSign ==
    /\ Attacker /\ t <= H /\ ops < MaxOps
    /\ \/ \E v \in {Cap, MaxV}, n \in NonceChoices, id \in AttackerIds :
            Ask([kind |-> "tx", n |-> n, to |-> Hub, v |-> v, id |-> id, src |-> "attacker"], ledger, FALSE)
       \/ Ask([kind |-> "auth", n |-> Pending, to |-> Hub, v |-> 0, id |-> NoIntent, src |-> "attacker"], ledger, FALSE)
    /\ ops' = ops + 1
    /\ UNCHANGED << t, userDone, swept, frozen, unexplained, ledger, executed, mined, delegated, loss >>

\* The attacker broadcasts a signature it held.
AttackerSend ==
    /\ t <= H
    /\ \E s \in signed : /\ s.src = "attacker" /\ s.kind = "tx" /\ s.k \notin bcast /\ s.k \notin executed
                         /\ bcast' = bcast \cup {s.k}
    /\ UNCHANGED << t, ops, userDone, swept, frozen, alarm, unexplained, ledger, used, signed, executed,
                    mined, delegated, loss, refusals >>

\* The chain executes the broadcast transaction with the next nonce; other signatures for that nonce die.
Execute ==
    /\ \E s \in signed :
         /\ s.kind = "tx" /\ s.k \in bcast /\ s.k \notin executed /\ s.n = mined
         /\ executed' = executed \cup {x.k : x \in {y \in signed : y.kind = "tx" /\ y.n = s.n}}
         /\ mined' = mined + 1
         /\ loss' = IF s.to = Hub THEN loss + s.v ELSE loss
         /\ unexplained' = (unexplained \/ ~Matches(ledger, s))
    /\ UNCHANGED << t, ops, userDone, swept, frozen, alarm, ledger, used, signed, bcast, delegated, refusals >>

\* A signed EIP-7702 authorization takes effect (the attacker submits it from its own account).
Delegate ==
    /\ \E s \in signed : /\ s.kind = "auth" /\ s.k \notin executed
                         /\ executed' = executed \cup {s.k}
    /\ delegated' = TRUE
    /\ UNCHANGED << t, ops, userDone, swept, frozen, alarm, unexplained, ledger, used, signed, bcast,
                    mined, loss, refusals >>

\* Delegated code lets the attacker drain without any further signature.
Drain ==
    /\ delegated /\ ~swept /\ t <= H
    /\ swept' = TRUE /\ loss' = loss + Sweep /\ unexplained' = TRUE
    /\ UNCHANGED << t, ops, userDone, frozen, alarm, ledger, used, signed, bcast, executed, mined,
                    delegated, refusals >>

\* End of block. A broadcast transaction with the next nonce has been mined. The watcher (C4) reconciles the
\* block against the intent ledger and contains: freeze the signer, revoke any delegation (break-glass), and
\* thereby invalidate unused authorizations.
Executable == \E s \in signed : s.kind = "tx" /\ s.k \in bcast /\ s.k \notin executed /\ s.n = mined
Tick ==
    /\ t <= H /\ ~Executable
    /\ LET contain == Watcher /\ (alarm \/ unexplained \/ delegated)
       IN /\ frozen' = (frozen \/ contain)
          /\ delegated' = (delegated /\ ~contain)
          /\ executed' = IF contain THEN executed \cup {x.k : x \in {y \in signed : y.kind = "auth"}}
                                    ELSE executed
    /\ t' = t + 1 /\ ops' = 0 /\ userDone' = FALSE /\ swept' = FALSE /\ alarm' = FALSE /\ unexplained' = FALSE
    /\ UNCHANGED << ledger, used, signed, bcast, mined, loss, refusals >>

Next == UserWithdrawal \/ AttackerIntent \/ AttackerSign \/ AttackerSend \/ Execute \/ Delegate \/ Drain \/ Tick
Spec == Init /\ [][Next]_vars

----------------------------------------------------------------------------
TypeOK ==
    /\ t \in 0..(H + 1) /\ ops \in 0..MaxOps
    /\ userDone \in BOOLEAN /\ swept \in BOOLEAN /\ frozen \in BOOLEAN /\ alarm \in BOOLEAN
    /\ unexplained \in BOOLEAN /\ delegated \in BOOLEAN /\ loss \in Nat /\ mined \in Nat
    /\ bcast \subseteq {s.k : s \in signed} /\ executed \subseteq {s.k : s \in signed}

\* T1 Intent soundness: with intents on, every signature carries an intent the authority signed for exactly
\* this destination and value, and no intent is used twice.
T1_IntentSoundness ==
    (Semantic /\ Intents) =>
        /\ \A s \in signed : s.kind = "tx" /\ Matches(ledger, s)
        /\ \A s1, s2 \in signed : s1.id = s2.id => s1.k = s2.k

\* T2 No delegation: the semantic signer never signs an EIP-7702 authorization.
T2_NoDelegation == Semantic => (~delegated /\ \A s \in signed : s.kind = "tx")

\* T3 Exposure bound. (a) Every window of T blocks carries at most B of signatures. (b) Hence the loss is at most
\* B per window up to the current block. (c) With containment on every attacker outflow, the loss is at most B
\* plus what is held from earlier windows: at most Nu signatures of at most Cap (one wallet here).
T3a_WindowBudget == Semantic => \A b \in 0..t : WindowAt(b) <= B
T3b_Exposure == Semantic => loss <= B * ((t + T) \div T)
T3c_Contained == (Semantic /\ Watcher /\ ~IACompromised) => loss <= B + Nu * Cap
\* The earlier, stronger claim. Expected to FAIL: TLC should print a trace in which held signatures are spent
\* together with a fresh window's budget (attacker A10).
T3c_ContainedWithoutHoarding == (Semantic /\ Watcher /\ ~IACompromised) => loss <= B

\* T4 Containment latency: a block that raised an alarm, saw an unexplained outflow or a delegation ends frozen.
T4_ContainWithinBlock == [][(Watcher /\ t' = t + 1 /\ (alarm \/ unexplained \/ delegated)) => frozen']_vars

\* T5 Impossibility for detection alone. Expected to FAIL without pre-signing controls (configuration R2):
\* TLC should print a one-block drain that completes before the watcher can act.
T5_NoLoss == loss = 0

\* T6 Liveness (as a safety property): without an attacker, nothing freezes and no legitimate request is refused.
T6_NoFalseContainment == ~Attacker => (~frozen /\ refusals = {})

\* T7 Budget non-exhaustion: with intents on and the authority intact, the attacker cannot use up the budget,
\* so no legitimate request is ever refused for budget.
T7_NoBudgetExhaustion == (Semantic /\ Intents /\ ~IACompromised) => "velocity" \notin refusals
=============================================================================
