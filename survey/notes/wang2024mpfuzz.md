# wang2024mpfuzz — mpfuzz (USENIX Security 2024)

Wang, Tang, Li, Ding, Yang. *Understanding Ethereum Mempool Security under Asymmetric DoS by
Symbolized Stateful Fuzzing.* 33rd USENIX Security Symposium, 2024, pp. 4747–4764.
Copy read: USENIX proceedings PDF, 19 pages, sha256 `5ab3a5f9…a97e` (held locally, not in git). Page numbers are PDF pages.

## What it is
A fuzzer that searches mempool states described by transaction "symbols" — future, parent,
overdraft, latent overdraft, replacement — to find asymmetric denial-of-service bugs (ADAMS), where
cheap invalid transactions evict or lock out normal ones. Run on six execution clients (Geth, Besu,
Nethermind, Erigon, Reth, OpenEthereum), three PBS builders and three Ethereum-like chains. (pp. 2–4)

## Facts worth citing
- The 2021 DETER bugs were fixed in all major clients, including Besu, by Fall 2023; mpfuzz finds new
  ones on the patched clients. (p. 2)
- Clients admit transactions to the mempool *without executing them*, so admission depends on
  nonce, balance and fee rules, not on what the transaction would do. (p. 7)
- A latent overdraft is a transaction that is affordable on its own but not after its
  lower-nonce siblings; e.g. balance 5 ETH, nonce 1 spends 2, nonce 2 spends 4. (p. 4)
- Per-client results table, including a Besu split at v22.7.4. (p. 10)
- Findings disclosed to the Ethereum Foundation's bug bounty programme. (p. 14)
- More than 100× faster than baseline fuzzers at rediscovering DETER exploits. (pp. 2–3)

## Use in our papers
- **Vocabulary for limitation E8.** In our Besu runs the hot wallet's withdrawals beyond its balance
  were admitted and queued in nonce order (overdraft / latent-overdraft transactions in mpfuzz's
  terms), then executed when a top-up arrived. Hardhat's node rejected them at submission. Describe
  this as a difference in admission policy, cite mpfuzz for the concept, and say that we study its
  effect on *loss*, which mpfuzz does not (it studies DoS).
- **Sim-to-real argument (Paper A or a methods note).** Results that depend on mempool admission
  must be run on a real client; a single development node can hide or invent behaviour.
- **Version pinning.** Admission rules change between client versions (their table splits Besu at
  v22.7.4). Record the exact Besu version (26.8.0) with every result.
