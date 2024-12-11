// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {SecurityToken} from "./SecurityToken.sol";
import {IComplainceFactory, ComplainceFactory} from "./ComplainceFactory.sol";
import {ModuleFactory} from "./ModuleFactory.sol";
import {IModuleFactory} from "./IModuleFactory.sol";
import {ISecurityTokenFactory} from "./ISecurityTokenFactory.sol";
import {IdentityStorage} from "./IdentityStorage.sol";
import {ModularCompliance} from "./ModularCompliance.sol";
import {SupplyLimitModule} from "./SupplyLimitModule.sol";

contract SecurityTokenFactory is ISecurityTokenFactory {
    IdentityStorage _identityStorage;
    ModularCompliance _modularCompliance;
    address private complainceFactory;
    address private moduleFactory;
    uint256 public tokenCount;

    mapping(uint256 => securityTokenInfo) public securityTokenList;
    mapping (address => securityTokenInfo) public securityTokenConfiguration;

    constructor(address _complainceFactory, address _moduleFactory) {
        complainceFactory = _complainceFactory;
        moduleFactory = _moduleFactory;
    }

    function createSecurityToken(securityTokenParams memory params)
        public
        returns (address)
    {
        IComplainceFactory complianceFactory = IComplainceFactory(
            complainceFactory
        );
        IModuleFactory _moduleFactory = IModuleFactory(moduleFactory);

        IdentityStorage identityStorage = IdentityStorage(
            complianceFactory.deployIdentityStorage()
        );

        identityStorage.initialize(msg.sender);

        ModularCompliance compliance = ModularCompliance(
            complianceFactory.deployModularCompliance()
        );

        compliance.init(msg.sender);
        SecurityToken token = new SecurityToken();
          token.init(
            address(identityStorage),
            address(compliance),
            msg.sender,
            address(this),
            params._name,
            params._symbol,
            params._decimals,
            params._initialSupply
        );
        compliance.bindToken(address(token));
        securityTokenInfo memory newTokenInfo;
        newTokenInfo._tokenAddress = address(token);
        newTokenInfo._identityStorage = address(identityStorage);
        newTokenInfo._modularCompliance = address(compliance);

        //uint256 limit:: contract : SupplyLimitModule ok
        if (params._securityTokenCompliance.supplyLimit > 0) {
            address supplyModule = (
                _moduleFactory.deploySupplyLimitModule(
                    params._securityTokenCompliance.supplyLimit
                )
            );
            newTokenInfo._supplyLimitModule = supplyModule;
            compliance.addModule(supplyModule);
            bytes memory setSupplyLimit = abi.encodeWithSignature(
                "setSupplyLimit(uint256)",
                params._securityTokenCompliance.supplyLimit
            );
            compliance.callModuleFunction(setSupplyLimit, supplyModule);
        }
        //bool :: contract : conditionalTransferModule  not ok
        if (params._securityTokenCompliance.conditionalTransferLimit == true) {
            address conditionalTransferModule = _moduleFactory
                .deployConditionalTransferModule();
            newTokenInfo._conditionalTransferModule = conditionalTransferModule;
            compliance.addModule(conditionalTransferModule);
            //  bytes memory setConditionalTransferLimit = abi.encodeWithSignature("setConditionalTransferLimit(uint256)",params._securityTokenCompliance.conditionalTransferLimit);
            //  compliance.callModuleFunction(setConditionalTransferLimit,conditionalTransferModule);
        }
        //uint bal :: contract : MaxBalanceModule ok
        if (params._securityTokenCompliance.maxBalance > 0) {
    address balanceModule = _moduleFactory.deployMaxBalanceModule(
        params._securityTokenCompliance.maxBalance
    );
    newTokenInfo._maxBalanceModule = balanceModule;
    compliance.addModule(balanceModule);

    // Properly encode the setMaxBalance function call
    bytes memory setBalanceLimit = abi.encodeWithSignature(
        "setMaxBalance(uint256)", // Corrected function signature
        params._securityTokenCompliance.maxBalance
    );

    compliance.callModuleFunction(setBalanceLimit, balanceModule);
}

        // bool restriction :: contract TransferRestriction Module
        if (params._securityTokenCompliance.transferRestriction == true) {
            address transferRestrictionModule = complianceFactory
                .deployTransferRestrictModule();
            newTokenInfo._transferRestrictionModule = transferRestrictionModule;
            compliance.addModule(transferRestrictionModule);
            // bytes memory setTransferRestriction = abi.encodeWithSignature("setTransferRestrictModule(bool _isEnable)",params._securityTokenCompliance.transferRestriction);
            // compliance.callModuleFunction(setTransferRestriction,transferRestrictionModule);
        }
        // struct timeTransferLimit : contract :: TimeTransfersLimitsModule ok
       if (params._securityTokenCompliance.transferLimit.limitValue > 0) {
    address timeTransferLimit = complianceFactory
        .deployTimeTransferLimitsModule();
    newTokenInfo._timeTransferLimitModule = timeTransferLimit;
    compliance.addModule(timeTransferLimit);

    // Properly encode the struct as a tuple
    bytes memory setTransferLimit = abi.encodeWithSignature(
        "setTimeTransferLimit((uint32,uint256))", // Match the struct's layout
        params._securityTokenCompliance.transferLimit.limitTime, 
        params._securityTokenCompliance.transferLimit.limitValue
    );

    compliance.callModuleFunction(setTransferLimit, timeTransferLimit);
}
        securityTokenList[tokenCount] = newTokenInfo;
        securityTokenConfiguration[address(token)] = newTokenInfo;

        tokenCount++;

        emit CreatedNewSecurityToken(
            address(token),
            address(identityStorage),
            address(compliance),
            params._name
        );
        return address(token);
    }
}
