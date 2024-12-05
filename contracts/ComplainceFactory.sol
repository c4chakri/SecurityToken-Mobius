// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IdentityStorage} from "./IdentityStorage.sol";
import {ModularCompliance} from "./ModularCompliance.sol";
import {TransferRestrictModule} from "./TransferRestrictModule.sol";
import {TimeTransfersLimitsModule} from "./TimeTransfersLimitsModule.sol";

contract ComplainceFactory {
    function deployIdentityStorage() external returns (address) {
        IdentityStorage identityStorage = new IdentityStorage();
        require(
            address(identityStorage) != address(0),
            "Unable to deploy the module."
        );
        return address(identityStorage);
    }

    function deployModularCompliance() external returns (address) {
        ModularCompliance modularCompliance = new ModularCompliance();
        require(
            address(modularCompliance) != address(0),
            "Unable to deploy the module."
        );
        return address(modularCompliance);
    }

    function deployTransferRestrictModule() external returns (address) {
        TransferRestrictModule module = (new TransferRestrictModule());
        require(address(module) != address(0), "Unable to deploy the module.");
        return address(module);
    }

    function deployTimeTransferLimitsModule() external returns (address) {
        TimeTransfersLimitsModule module = new TimeTransfersLimitsModule();
        require(address(module) != address(0), "Unable to deploy the module.");
        return address(module);
    }
}

interface IComplainceFactory {
    function deployIdentityStorage() external returns (IdentityStorage);

    function deployModularCompliance() external returns (ModularCompliance);

    function deployTransferRestrictModule() external returns (address);

    function deployTimeTransferLimitsModule() external returns (address);

    // function deploySupplyLimitModule(uint256 _supplyLimit)
    //     external
    //     returns (address);

    // function deployConditionalTransferModule(uint256 _amountLimit)
    //     external
    //     returns (address);
}
