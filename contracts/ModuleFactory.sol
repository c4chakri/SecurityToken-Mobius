// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
import {SupplyLimitModule} from "./SupplyLimitModule.sol";
import {MaxBalanceModule} from "./MaxBalanceModule.sol";
import {ConditionalTransferModule} from "./ConditionalTransferModule.sol";
import {TimeTransfersLimitsModule} from "./TimeTransfersLimitsModule.sol";
import {IModuleFactory} from "./IModuleFactory.sol";
import {TransferRestrictModule} from "./TransferRestrictModule.sol";

contract ModuleFactory is IModuleFactory {
    function deploySupplyLimitModule(uint256 _supplyLimit)
        external
        returns (address)
    {
        require(
            _supplyLimit > 0,
            "Cannot create a Supply Limit Module with 0 supply limit"
        );
        SupplyLimitModule module = (new SupplyLimitModule());
        require(address(module) != address(0), "Unable to deploy the module.");
        module.initialize();
        return address(module);
    }

    function deployConditionalTransferModule()
        external
        returns (address)
    {
        ConditionalTransferModule module = new ConditionalTransferModule();
        require(address(module) != address(0), "Unable to deploy the module.");
        module.initialize();
        return address(module);
    }

    function deployMaxBalanceModule(uint256 _maxBalance)
        external
        returns (address)
    {
        require(
            _maxBalance > 0,
            "Cannot create a Max Balance Module with 0 balance"
        );

        MaxBalanceModule module = new MaxBalanceModule();
        require(address(module) != address(0), "Unable to deploy the module.");
        module.initialize();
        return address(module);
    }
    // function deployTransferRestrictModule() external returns (address) {
    //     TransferRestrictModule module = (new TransferRestrictModule());
    //     require(address(module) != address(0), "Unable to deploy the module.");
    //     return address(module);
    // }
    // function deployTimeTransferLimitsModule() external returns (address) {
    //     TimeTransfersLimitsModule module = new TimeTransfersLimitsModule();
    //     require(
    //         address(module) != address(0), "Unable to deploy the module."
    //     );
    //     return address(module);
    // }
}
