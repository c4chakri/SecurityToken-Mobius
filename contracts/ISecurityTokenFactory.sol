// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
import {TimeTransfersLimitsModule} from "./TimeTransfersLimitsModule.sol";
interface ISecurityTokenFactory {
    
    event CreatedNewSecurityToken(
        address indexed newSecurityToken,
        address indexed identityStorage,
        address indexed modularCompliance,
        string name
    );

    struct securityTokenInfo {
        address _tokenAddress;
        address _identityStorage;
        address _modularCompliance;
        address _maxBalanceModule;
        address _transferRestrictionModule;
        address _supplyLimitModule;
        address _timeTransferLimitModule;
        address _conditionalTransferModule;
    }
     struct Compliance {
        uint256 maxBalance;
        uint256 supplyLimit;
        bool conditionalTransferLimit;
        bool transferRestriction;
        TimeTransfersLimitsModule.Limit transferLimit;

    }
    struct securityTokenParams {
        string _name;
        string _symbol;
        uint8 _decimals;
        uint256 _initialSupply;
        Compliance _securityTokenCompliance;
    }
}