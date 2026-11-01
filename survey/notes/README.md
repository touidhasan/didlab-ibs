# Reading notes: core references

One note per paper we have read in full. Each note gives the exact version read (with a short
sha256), facts with PDF page numbers, how we use the paper, and cautions. Notes are our own words;
draft from these and check the page in the PDF before quoting.

| Key | Paper | Read for |
|---|---|---|
| [meng2026houston](meng2026houston.md) | HOUSTON, NDSS 2026 | C4 comparison; evaluation template |
| [liu2024montecrypto](liu2024montecrypto.md) | Count of Monte Crypto, arXiv v3 2026 | C4 and C1 architecture (report-then-execute) |
| [huang2026darkside](huang2026darkside.md) | EIP-7702 risks, USENIX Security 2026 | A3, C2 motivation |
| [erinle2025sokwallets](erinle2025sokwallets.md) | Wallet SoK, Computer Networks 2025 | Survey positioning; C4 gap (1 of 29 defences is a response) |
| [zhou2023sokdefi](zhou2023sokdefi.md) | DeFi attacks SoK, IEEE S&P 2023 | C4 motivation (rescue window vs pause speed) |
| [wang2024mpfuzz](wang2024mpfuzz.md) | mpfuzz, USENIX Security 2024 | Limitation E8 vocabulary; sim-to-real |

## Where the PDFs are

The PDFs are **not in git**: they are publisher or author copies, and the repository will be public.
`survey/papers/` is listed in `.gitignore`. Keep the master copies in two places:

1. The claude.ai Project ("Blockchain application professional project") as project files, so any
   drafting session can read them.
2. The research VM, outside the repository, e.g. `/opt/didlab-research/papers/`.

File names: `<key>.pdf`, using the keys above. The sha256 prefixes in each note identify the version
read; a newer version of the same paper gets a new note section, not a silent update.
