// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface ITimeTransfersLimitsModule {
    /// Struct for transfer counters
    struct TransferCounter {
        uint256 value;
        uint256 timer;
    }

    /// Struct for limits
    struct Limit {
        uint32 limitTime;
        uint256 limitValue;
    }

    /// Struct for limit index
    struct IndexLimit {
        bool attributedLimit;
        uint8 limitIndex;
    }

    /**
     * @dev Emitted when a transfer limit is updated for a given compliance address and limit time.
     * @param compliance The compliance contract address.
     * @param limitTime The period of the limit.
     * @param limitValue The value of the limit.
     */
    event TimeTransferLimitUpdated(
        address indexed compliance,
        uint32 limitTime,
        uint256 limitValue
    );

    /**
     * @dev Error for exceeding the size of the limits array.
     * @param compliance The compliance contract address.
     * @param arraySize The current size of the array.
     */
    error LimitsArraySizeExceeded(address compliance, uint arraySize);

    /**
     * @dev Initializes the contract and sets the initial state.
     * This function should only be called once during deployment.
     */
    function initialize() external;

    /**
     * @dev Sets the transfer limit for a specific time frame.
     * @param _limit The limit time and value.
     */
    function setTimeTransferLimit(Limit calldata _limit) external;

    /**
     * @dev Handles transfer-related actions for the module.
     * @param _from The sender's address.
     * @param _value The value of the transfer.
     */
    // function moduleTransferAction(address _from, address _to, uint256 _value) external;

    /**
     * @dev Handles mint-related actions for the module.
     * @param _to The recipient's address.
     * @param _value The value of the mint.
     */
    
    /**
     * @dev Handles burn-related actions for the module.
     * @param _from The address burning tokens.
     * @param _value The value of the burn.
     */
   
    /**
     * @dev Checks if a transfer is allowed under the module's constraints.
     * @param _from The sender's address.
     * @param _to The recipient's address.
     * @param _value The value of the transfer.
     * @param _compliance The compliance contract address.
     * @return True if the transfer is allowed, false otherwise.
     */
   
    /**
     * @dev Returns the transfer limits for a compliance address.
     * @param _compliance The compliance contract address.
     * @return limits An array of transfer limits.
     */
    function getTimeTransferLimits(address _compliance)
        external
        view
        returns (Limit[] memory limits);

    /**
     * @dev Indicates whether the module can bind to compliance.
     * @return True if binding is possible, false otherwise.
     */
    function canComplianceBind() external pure returns (bool);

    /**
     * @dev Indicates whether the module is plug-and-play compatible.
     * @return True if compatible, false otherwise.
     */
  
    /**
     * @dev Returns the name of the module.
     * @return _name The name of the module.
     */
}