// SPDX-License-Identifier: MIT


pragma solidity ^0.8.21;

import "./IIdentityStorage.sol";
import "./IModularCompliance.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISecurityToken is IERC20 {

    event UpdatedTokenInformation(string indexed _newName, string indexed _newSymbol, uint8 _newDecimals, uint256 maxTotalSupply);
 
    event ComplianceAdded(address indexed _compliance);

    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);

    event TokensFrozen(address indexed _userAddress, uint256 _amount);
 
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);

    event MaxSupplyIncreased(uint256 newMaxSupply);

    event Paused(address _userAddress);

    event Unpaused(address _userAddress);

    function setName(string calldata _name) external;

    function setSymbol(string calldata _symbol) external;

    function pause() external;

    function unpause() external;

    function setAddressFrozen(address _userAddress, bool _freeze) external;

    function freezePartialTokens(address _userAddress, uint256 _amount) external;

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;

    function setIdentityStorage(address _identityStorage) external;

    function setCompliance(address _compliance) external;

    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool);

    function mint(address _to, uint256 _amount) external;

    function burn(address _userAddress, uint256 _amount) external;

    // function recoveryAddress(
    //     address _lostWallet,
    //     address _newWallet,
    //     address _investorAddress
    // ) external returns (bool);

    function batchTransfer(address[] calldata _toList, uint256[] calldata _amounts) external;

    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external;

    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external;

    function batchBurn(address[] calldata _userAddresses, uint256[] calldata _amounts) external;

    function batchSetAddressFrozen(address[] calldata _userAddresses, bool[] calldata _freeze) external;

    function batchFreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external;

    function batchUnfreezePartialTokens(address[] calldata _userAddresses, uint256[] calldata _amounts) external;

    function decimals() external view returns (uint8);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function identityStorage() external view returns (IIdentityStorage);

    function compliance() external view returns (IModularCompliance);

    function isFrozen(address _userAddress) external view returns (bool);

    function getFrozenTokens(address _userAddress) external view returns (uint256);
}