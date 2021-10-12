//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @notice Purpose struct
struct DiamondLock {
    address owner;
    uint256 amount;
    uint256 unlockTimestamp;
}

/**
 @title Challenge 1 - Diamond Hands. Build a diamond hands contract that allows users to deposit ETH. Every time they deposit ETH, it will be locked for two years.
 @author Emanuele Ricci @StErMi
*/
contract DiamondHand {
    /// @notice Lock period
    uint256 constant lockPeriod = 2 * 365 days;

    /// @notice Track user investments
    mapping(address => DiamondLock) private diamonds;

    /// @notice Event when a Diamond is locked
    event PurposeChange(address indexed owner, uint256 value, uint256 unlockTimestamp);

    function deposit() public payable {
        require(msg.value > 0, "You need to lock at least some ETH");

        DiamondLock memory lock = diamonds[msg.sender];
        // it's a new one or he has withdrawn everything
        if (lock.amount == 0) {
            lock = DiamondLock(msg.sender, msg.value, block.timestamp + lockPeriod);
        } else {
            lock.amount += msg.value;
        }

        diamonds[msg.sender] = lock;

        emit PurposeChange(lock.owner, lock.amount, lock.unlockTimestamp);
    }

    function withdraw() public {
        DiamondLock memory lock = diamonds[msg.sender];
        uint256 balance = lock.amount;

        require(balance > 0, "Your diamond has not enough balance to send");
        require(lock.unlockTimestamp < block.timestamp, "Your diamond is still locked");

        diamonds[msg.sender].amount = 0;

        (bool success, ) = lock.owner.call{value: balance}("");
        require(success, "Unable to send value, recipient may have reverted");
    }

    function getDiamond(address owner) public view returns (DiamondLock memory diamond) {
        return diamonds[owner];
    }
}
