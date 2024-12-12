const { expect } = require("chai");
const { ethers } = require("hardhat");
const { string } = require("hardhat/internal/core/params/argumentTypes");


describe("SecurityTokenFactory", function () {
  let compliance, module, factory;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const complianceFactory = await ethers.getContractFactory("ComplainceFactory");
    compliance = await complianceFactory.deploy();

    const moduleFactory = await ethers.getContractFactory("ModuleFactory");
    module = await moduleFactory.deploy();

    const SecurityTokenFactory = await ethers.getContractFactory("SecurityTokenFactory");
    factory = await SecurityTokenFactory.deploy(compliance.target, module.target);

    //console.log("SecurityTokenFactory deployed to:", factory.target);

  })

  it("should create a new security token", async function () {
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("1000000");

    const maxSupply = ethers.parseEther("1000000");
    const supplyLimit = ethers.parseEther("1000000");
    const conditionalTransferLimit = true
    const transferRestriction = true
    const limit = [10, 10] //[limitTime,limitValue]

    const params = [
      name,
      symbol,
      decimals,
      supply,
      [
        maxSupply,
        supplyLimit,
        conditionalTransferLimit,
        transferRestriction,
        limit
      ]
    ]

    const tx = await factory.createSecurityToken(params);

    const receipt = await tx.wait();

    const event = receipt.logs.at(-1).args;
    //console.log("Security Token Created:", event[0]);

    expect(event[3]).to.equal(name);
  })

  it("should create a new security token and checks All complaince modules", async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("1000000");

    const maxSupply = ethers.parseEther("20000000");
    const supplyLimit = ethers.parseEther("20000");
    const conditionalTransferLimit = true
    const transferRestriction = true
    const limitTime = 3600; // 1 hour
    const limitValue = ethers.parseEther("10000000");
    const limit = [limitTime, limitValue] //[limitTime,limitValue]

    const params = [
      name,
      symbol,
      decimals,
      supply,
      [
        maxSupply,
        supplyLimit,
        conditionalTransferLimit,
        transferRestriction,
        limit
      ]
    ]

    const tx = await factory.createSecurityToken(params);

    const receipt = await tx.wait();

    const event = receipt.logs.at(-1).args;
    //console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);
    //console.log("securityTokenConfigs", securityTokenConfigs);

    const mintAmount = ethers.parseEther("1000");
    const transferAmt = ethers.parseEther("250");

    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);

    //*******************************conditionalTransferContract************************************** */
    const conditionalTransferContract = await ethers.getContractAt("ConditionalTransferModule", securityTokenConfigs[7]);
    // approve transfer from zero address to addr1
    const functionAbi = new ethers.Interface([
      "function approveTransfer(address, address, uint256)",
    ]);
    const approveTransferData = functionAbi.encodeFunctionData(
      "approveTransfer",
      [ethers.ZeroAddress, addr1.address, mintAmount]
    );

    const tx_ = await modularComplainceContract
      .connect(owner)
      .callModuleFunction(approveTransferData, conditionalTransferContract);

    await tx_.wait();
    // Verify moduleCheck for compliance
    const isCompliant = await conditionalTransferContract.moduleCheck(
      ethers.ZeroAddress,
      addr1,
      mintAmount,
      securityTokenConfigs[2]
    );
    expect(isCompliant).to.be.true;

    // approve transfer from addr1 to addr2
    const functionAbi_ = new ethers.Interface([
      "function approveTransfer(address, address, uint256)",
    ]);

    const approveTransferData_ = functionAbi_.encodeFunctionData(
      "approveTransfer",
      [addr1.address, addr2.address, transferAmt]
    );

    const _tx = await modularComplainceContract
      .connect(owner)
      .callModuleFunction(approveTransferData_, securityTokenConfigs[7]);

    await _tx.wait();


    const isTransferble = await conditionalTransferContract.moduleCheck(
      addr1,
      addr2,
      transferAmt,
      securityTokenConfigs[2]
    )

    expect(isTransferble).to.be.true;

    //************************************ supplyLimitModule *********************************************************** */
    const supplyLimitModule = await ethers.getContractAt("SupplyLimitModule", securityTokenConfigs[5]);
    const retrievedLimit = await supplyLimitModule.getSupplyLimit(
      modularComplainceContract
    );
    expect(retrievedLimit).to.equal(supplyLimit);

    //**************************timeTransfersLimitsModule ************************************ */
    const timeTransfersLimitsModule = await ethers.getContractAt("TimeTransfersLimitsModule", securityTokenConfigs[6]);
    const moduleCheckData = await timeTransfersLimitsModule.moduleCheck(
      addr2.address,
      ethers.ZeroAddress,
      ethers.parseEther("50"),
      securityTokenConfigs[2]
    );

    expect(moduleCheckData).to.be.true;
    //************************************* maxBalanceModule ******************************************************** */

    // const maxBalanceModule = await ethers.getContractAt("MaxBalanceModule", securityTokenConfigs[3]);
    // const currentMaxBalance = await maxBalanceModule.getIDBalance(
    //   event[2],
    //   addr1
    // );

    //********************************* Transfer Restriction Module ********************************** */
    const transferRestrictModuleContract = await ethers.getContractAt("TransferRestrictModule", securityTokenConfigs[4]);
    const moduleInterface = new ethers.Interface([
      "function allowUser(address _userAddress)",
    ]);

    const allowUserData = moduleInterface.encodeFunctionData("allowUser", [
      addr1.address,
    ]);

    await modularComplainceContract
      .connect(owner)
      .callModuleFunction(allowUserData, securityTokenConfigs[4]);

    const isAllowed = await transferRestrictModuleContract.isUserAllowed(
      event[2],
      addr1.address
    );
    expect(isAllowed).to.be.true;


    //************************************ Actual transactions *************************************** */


    // Mint tokens; should succeed if compliance is met
    await expect(securityTokenContract.connect(owner).mint(addr1.address, mintAmount))
      .to.emit(securityTokenContract, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(mintAmount);

    //unPause
    await securityTokenContract.connect(owner).unpause();
    // transfer

    await securityTokenContract.connect(addr1).transfer(addr2.address, transferAmt);


    expect(await securityTokenContract.balanceOf(addr2.address)).to.equal(transferAmt);
    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(mintAmount - transferAmt);

    // transfer to addr1 from addr2

    // approve ==> conditional transfer
    // allow ==>  transfer restriction
    // mint ==> supply limit


  })



  it("should create a new security token and checks setTimeTransferLimit Module", async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("1000000");

    const maxSupply = ethers.parseEther("0");
    const supplyLimit = ethers.parseEther("0");
    const conditionalTransferLimit = false
    const transferRestriction = false

    const limitTime = 3600; // 1 hour
    const limitValue = ethers.parseEther("100");
    const limit = [limitTime, limitValue] //[limitTime,limitValue]

    const params = [
      name,
      symbol,
      decimals,
      supply,
      [
        maxSupply,
        supplyLimit,
        conditionalTransferLimit,
        transferRestriction,
        limit
      ]
    ]

    const tx = await factory.createSecurityToken(params);

    const receipt = await tx.wait();

    const event = receipt.logs.at(-1).args;
    // //console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);


    const timeTransferLimitModuleAddress = securityTokenConfigs[6];



    //console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[6]));

    //console.log("securityTokenConfigs", securityTokenConfigs);
    //*******************************timeTransfersLimitsModule******************************** */
    const timeTransfersLimitsModule = await ethers.getContractAt("TimeTransfersLimitsModule", timeTransferLimitModuleAddress);
    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);

    const limits = await timeTransfersLimitsModule.getTimeTransferLimits(
      securityTokenConfigs[2]
    );



    const moduleCheckData = await timeTransfersLimitsModule.moduleCheck(
      addr2.address,
      ethers.ZeroAddress,
      ethers.parseEther("50"),
      securityTokenConfigs[2]
    );
    expect(moduleCheckData).to.be.true;
    await securityTokenContract.connect(owner).mint(addr1, ethers.parseEther("1000"));

    await securityTokenContract.connect(owner).unpause();
    await securityTokenContract.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));
    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(ethers.parseEther("950"));
    expect(await securityTokenContract.balanceOf(addr2.address)).to.equal(ethers.parseEther("50"));


  })




  it("should create a new security token and checks Conditional Transfer Module", async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("1000000");

    const maxSupply = ethers.parseEther("0");
    const supplyLimit = ethers.parseEther("0");
    const conditionalTransferLimit = true
    const transferRestriction = false
    const limit = [0, 0] //[limitTime,limitValue]

    const params = [
      name,
      symbol,
      decimals,
      supply,
      [
        maxSupply,
        supplyLimit,
        conditionalTransferLimit,
        transferRestriction,
        limit
      ]
    ]

    const tx = await factory.createSecurityToken(params);

    const receipt = await tx.wait();

    const event = receipt.logs.at(-1).args;
    //console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);


    const maxBalanceModuleAddress = securityTokenConfigs[3];;

    //console.log("decimals", await securityTokenContract.decimals());
    //console.log("totalUsers", await identityStorageContract.totalUsers());
    //console.log("maxbalAddr", maxBalanceModuleAddress);

    //console.log("name", await modularComplainceContract.name());
    //console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[3]));

    //console.log("securityTokenConfigs", securityTokenConfigs);

    const conditionalTransferContract = await ethers.getContractAt("ConditionalTransferModule", securityTokenConfigs[7]);

    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);

    const amount = ethers.parseEther("250");

    // Encode the call to approveTransfer function
    const functionAbi = new ethers.Interface([
      "function approveTransfer(address, address, uint256)",
    ]);
    const approveTransferData = functionAbi.encodeFunctionData(
      "approveTransfer",
      [ethers.ZeroAddress, addr1.address, amount]
    );

    const tx_ = await modularComplainceContract
      .connect(owner)
      .callModuleFunction(approveTransferData, conditionalTransferContract);

    await tx_.wait();



    // Verify moduleCheck for compliance
    const isCompliant = await conditionalTransferContract.moduleCheck(
      ethers.ZeroAddress,
      addr1,
      amount,
      securityTokenConfigs[2]
    );
    expect(isCompliant).to.be.true;

    //console.log("securityTokenContract owner", await securityTokenContract.owner());
    //console.log("token owner", owner.address);


    // Mint tokens; should succeed if compliance is met
    await expect(securityTokenContract.connect(owner).mint(addr1.address, amount))
      .to.emit(securityTokenContract, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, amount);

    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(amount);

    const transferAmt = ethers.parseEther("50");

    const functionAbi_ = new ethers.Interface([
      "function approveTransfer(address, address, uint256)",
    ]);

    const approveTransferData_ = functionAbi_.encodeFunctionData(
      "approveTransfer",
      [addr1.address, addr2.address, transferAmt]
    );

    const _tx = await modularComplainceContract
      .connect(owner)
      .callModuleFunction(approveTransferData_, securityTokenConfigs[7]);

    await _tx.wait();


    const isTransferble = await conditionalTransferContract.moduleCheck(
      addr1,
      addr2,
      transferAmt,
      securityTokenConfigs[2]
    )

    expect(isTransferble).to.be.true;

    await securityTokenContract.connect(owner).unpause();

    await securityTokenContract.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));

    //console.log("balance of user1", await securityTokenContract.balanceOf(addr1.address));
    //console.log("balance of user2", await securityTokenContract.balanceOf(addr2.address));
  })

  it("should create a new security token and checks SupplyLimit Module", async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("2000000");

    const maxSupply = ethers.parseEther("0");
    const supplyLimit = ethers.parseEther("1500");
    const conditionalTransferLimit = false
    const transferRestriction = false
    const limit = [0, 0] //[limitTime,limitValue]

    const params = [
      name,
      symbol,
      decimals,
      supply,
      [
        maxSupply,
        supplyLimit,
        conditionalTransferLimit,
        transferRestriction,
        limit
      ]
    ]

    const tx = await factory.createSecurityToken(params);

    const receipt = await tx.wait();

    const event = receipt.logs.at(-1).args;
    //console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);
    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);


    const supplyLimitModuleAddress = securityTokenConfigs[5];;

    const supplyLimitModule = await ethers.getContractAt("SupplyLimitModule", supplyLimitModuleAddress);



    const retrievedLimit = await supplyLimitModule.getSupplyLimit(
      modularComplainceContract
    );


    expect(retrievedLimit).to.equal(supplyLimit);


    await securityTokenContract.connect(owner).mint(addr1, ethers.parseEther("50"));

    await securityTokenContract.connect(owner).unpause();
    // trasfer
    await securityTokenContract.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
    //console.log("balance of user1", await securityTokenContract.balanceOf(addr1.address));
    //console.log("balance of user2", await securityTokenContract.balanceOf(addr2.address));
  })
  // it("should create a new security token and checks MaxSupply Module", async function () {
  //   [owner, addr1] = await ethers.getSigners();
  //   const name = "Test Token";
  //   const symbol = "TTK";
  //   const decimals = 18;
  //   const supply = ethers.parseEther("1000000");

  //   const maxSupply = ethers.parseEther("2000000");
  //   const supplyLimit = ethers.parseEther("0");
  //   const conditionalTransferLimit = false
  //   const transferRestriction = true
  //   const limit = [0, 0] //[limitTime,limitValue]

  //   const params = [
  //     name,
  //     symbol,
  //     decimals,
  //     supply,
  //     [
  //       maxSupply,
  //       supplyLimit,
  //       conditionalTransferLimit,
  //       transferRestriction,
  //       limit
  //     ]
  //   ]

  //   const tx = await factory.connect(owner).createSecurityToken(params);

  //   const receipt = await tx.wait();

  //   const event = receipt.logs.at(-1).args;
  //   //console.log("Security Token Created:", event[0]);


  //   expect(event[3]).to.equal(name);
  //   const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
  //   const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
  //   const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
  //   const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);
  //   await identityStorageContract
  //     .connect(owner)
  //     .registerUsers([addr1.address, addr2.address]);

  //   const maxBalanceModuleAddress = securityTokenConfigs[3];;

  //   //console.log("decimals", await securityTokenContract.decimals());
  //   //console.log("totalUsers", await identityStorageContract.totalUsers());
  //   //console.log("maxbalAddr", maxBalanceModuleAddress);

  //   //console.log("name", await modularComplainceContract.name());
  //   //console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[3]));

  //   //console.log("securityTokenConfigs", securityTokenConfigs);
  //   const maxBalanceModule = await ethers.getContractAt("MaxBalanceModule", maxBalanceModuleAddress);
  //   const currentMaxBalance = await maxBalanceModule.getIDBalance(
  //     event[2],
  //     addr1
  //   );

  //   //console.log("currentMaxBalance", currentMaxBalance);



  //   // const balance = ethers.parseEther("500");

  //   // await modularComplainceContract.removeModule(maxBalanceModule);
  //   // await modularComplainceContract.connect(owner).preSetModuleState(event[2], addr1.address, balance);

  //   // Encode the preSetModuleState function call
  //   // const moduleInterface = new ethers.Interface([
  //   //   "function preSetModuleState(address _compliance, address _id, uint256 _balance)",
  //   // ]);
  //   // const preSetData = moduleInterface.encodeFunctionData("preSetModuleState", [
  //   //     securityTokenConfigs[2],
  //   //   addr1.address,
  //   //   balance,
  //   // ]);
  //   //console.log("owner", await modularComplainceContract.owner());
  //   //console.log("haradat owner", owner.address);
  //   //console.log("addr1", addr1.address);


  //   // Call the module function through modularCompliance

  //   // const tx_ = await modularComplainceContract.connect(owner).callModuleFunction(
  //   //   preSetData,
  //   //   maxBalanceModuleAddress
  //   // );

  //   // await expect(tx_)
  //   //   .to.emit(maxBalanceModule, "IDBalancePreSet")
  //   //   .withArgs(securityTokenConfigs[2], addr1.address, balance);

  //   //   const investorBalance = await maxBalanceModule.getIDBalance(
  //   //     modularCompliance.target,
  //   //     addr1
  //   //   );
  //   //   //console.log("investorBalance",investorBalance);

  //   // Verify the balance has been set
  //   // const investorBalance = await maxBalanceModule.getIDBalance(
  //   //   securityTokenConfigs[2],
  //   //   addr1
  //   // );
  //   // expect(investorBalance).to.equal(balance);



  //   const isCompliant = await maxBalanceModule.moduleCheck(
  //     ethers.ZeroAddress,
  //     owner,
  //     maxSupply,
  //     securityTokenConfigs[3]
  //   );
  //   //console.log("isCompliant===========", isCompliant);


  //   await securityTokenContract.connect(owner).mint(addr1, ethers.parseEther("1000"));

  //   await securityTokenContract.connect(owner).unpause();

  //   await securityTokenContract.connect(addr1).transfer(addr2, ethers.parseEther("200"));
  // })
});


