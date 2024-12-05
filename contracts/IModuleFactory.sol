// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface  IModuleFactory {
    function deploySupplyLimitModule(uint256 _supplyLimit)
        external
        returns (address);
  function deployConditionalTransferModule()
        external
        returns (address);
    function deployMaxBalanceModule(uint256 _maxBalance)
        external
        returns (address);

}