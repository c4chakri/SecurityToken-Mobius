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

    console.log("SecurityTokenFactory deployed to:", factory.target);

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
    console.log("Security Token Created:", event[0]);

    expect(event[3]).to.equal(name);
  })

  it("should create a new security token and checks All complaince modules", async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const name = "Test Token";
    const symbol = "TTK";
    const decimals = 18;
    const supply = ethers.parseEther("1000000");

    const maxSupply = ethers.parseEther("0");
    const supplyLimit = ethers.parseEther("1500");
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
    console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);


    // const maxBalanceModuleAddress = securityTokenConfigs[3];;

    console.log("decimals", await securityTokenContract.decimals());
    console.log("totalUsers", await identityStorageContract.totalUsers());

    console.log("name", await modularComplainceContract.name());

    console.log("securityTokenConfigs", securityTokenConfigs);

    const conditionalTransferContract = await ethers.getContractAt("ConditionalTransferModule", securityTokenConfigs[7]);

    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);

    const amount =supplyLimit;

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

    console.log("securityTokenContract owner", await securityTokenContract.owner());
    console.log("token owner", owner.address);


    const supplyLimitModule = await ethers.getContractAt("SupplyLimitModule", securityTokenConfigs[5]);



    const retrievedLimit = await supplyLimitModule.getSupplyLimit(
      modularComplainceContract
    );


    expect(retrievedLimit).to.equal(supplyLimit);

    // Mint tokens; should succeed if compliance is met
    await expect(securityTokenContract.connect(owner).mint(addr1.address, amount))
      .to.emit(securityTokenContract, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, amount);

    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(amount);
  })


  it("should create a new security token and checks MaxSupply Module", async function () {
      [owner,addr1] = await ethers.getSigners();
      const name = "Test Token";
      const symbol = "TTK";
      const decimals = 18;
      const supply = ethers.parseEther("1000000");

      const maxSupply = ethers.parseEther("2000000");
      const supplyLimit = ethers.parseEther("0");
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

      const tx = await factory.connect(owner).createSecurityToken(params);

      const receipt = await tx.wait();

      const event = receipt.logs.at(-1).args;
      console.log("Security Token Created:", event[0]);


      expect(event[3]).to.equal(name);
      const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
      const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
      const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
      const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);


      const maxBalanceModuleAddress = securityTokenConfigs[3]; ;

      console.log("decimals", await securityTokenContract.decimals());
      console.log("totalUsers", await identityStorageContract.totalUsers());
          console.log("maxbalAddr", maxBalanceModuleAddress);

      console.log("name", await modularComplainceContract.name());
      console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[3]));

      console.log("securityTokenConfigs", securityTokenConfigs);
      const maxBalanceModule = await ethers.getContractAt("MaxBalanceModule", maxBalanceModuleAddress);
      const currentMaxBalance = await maxBalanceModule.getIDBalance(
          event[2],
          addr1
      );

      console.log("currentMaxBalance", currentMaxBalance);



      // const balance = ethers.parseEther("500");

      // await modularComplainceContract.removeModule(maxBalanceModule);
      // await modularComplainceContract.connect(owner).preSetModuleState(event[2], addr1.address, balance);

      // Encode the preSetModuleState function call
      // const moduleInterface = new ethers.Interface([
      //   "function preSetModuleState(address _compliance, address _id, uint256 _balance)",
      // ]);
      // const preSetData = moduleInterface.encodeFunctionData("preSetModuleState", [
      //     securityTokenConfigs[2],
      //   addr1.address,
      //   balance,
      // ]);
    console.log("owner",await modularComplainceContract.owner());
    console.log("haradat owner",owner.address);
    console.log("addr1",addr1.address);
 

      // Call the module function through modularCompliance

      // const tx_ = await modularComplainceContract.connect(owner).callModuleFunction(
      //   preSetData,
      //   maxBalanceModuleAddress
      // );

      // await expect(tx_)
      //   .to.emit(maxBalanceModule, "IDBalancePreSet")
      //   .withArgs(securityTokenConfigs[2], addr1.address, balance);

      //   const investorBalance = await maxBalanceModule.getIDBalance(
      //     modularCompliance.target,
      //     addr1
      //   );
      //   console.log("investorBalance",investorBalance);
        
      // Verify the balance has been set
      // const investorBalance = await maxBalanceModule.getIDBalance(
      //   securityTokenConfigs[2],
      //   addr1
      // );
      // expect(investorBalance).to.equal(balance);
      console.log("maxSupply mc",await maxBalanceModule._maxBalance(event[2]));
      console.log("maxLimit owner",await maxBalanceModule._maxBalance(owner));

      console.log("idBal",await maxBalanceModule._IDBalance(event[2],owner));
      
      
      
      
      const isCompliant = await maxBalanceModule.moduleCheck(
        ethers.ZeroAddress,
        owner,
        maxSupply,
        securityTokenConfigs[3]
      );
      console.log("isCompliant===========",isCompliant);
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
    console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);


    const maxBalanceModuleAddress = securityTokenConfigs[3];;

    console.log("decimals", await securityTokenContract.decimals());
    console.log("totalUsers", await identityStorageContract.totalUsers());
    console.log("maxbalAddr", maxBalanceModuleAddress);

    console.log("name", await modularComplainceContract.name());
    console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[3]));

    console.log("securityTokenConfigs", securityTokenConfigs);

    const conditionalTransferContract = await ethers.getContractAt("ConditionalTransferModule", securityTokenConfigs[7]);

    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);

    const amount = ethers.parseEther("100");

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

    console.log("securityTokenContract owner", await securityTokenContract.owner());
    console.log("token owner", owner.address);


    // Mint tokens; should succeed if compliance is met
    await expect(securityTokenContract.connect(owner).mint(addr1.address, amount))
      .to.emit(securityTokenContract, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, amount);

    expect(await securityTokenContract.balanceOf(addr1.address)).to.equal(amount);
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
    console.log("Security Token Created:", event[0]);


    expect(event[3]).to.equal(name);
    const securityTokenContract = await ethers.getContractAt("SecurityToken", event[0]);
    const identityStorageContract = await ethers.getContractAt("IdentityStorage", event[1]);
    const modularComplainceContract = await ethers.getContractAt("ModularCompliance", event[2]);
    const securityTokenConfigs = await factory.securityTokenConfiguration(event[0]);
    await identityStorageContract
      .connect(owner)
      .registerUsers([addr1.address, addr2.address]);


    const supplyLimitModuleAddress = securityTokenConfigs[5];;

    console.log("decimals", await securityTokenContract.decimals());
    console.log("totalUsers", await identityStorageContract.totalUsers());
    console.log("supplyLimitModuleAddress", supplyLimitModuleAddress);

    console.log("name", await modularComplainceContract.name());
    console.log("isModuleBound", await modularComplainceContract.isModuleBound(securityTokenConfigs[5]));

    console.log("securityTokenConfigs", securityTokenConfigs);

    const supplyLimitModule = await ethers.getContractAt("SupplyLimitModule", supplyLimitModuleAddress);



    const retrievedLimit = await supplyLimitModule.getSupplyLimit(
      modularComplainceContract
    );


    expect(retrievedLimit).to.equal(supplyLimit);

    const mintAmount = supplyLimit
    await securityTokenContract.connect(owner).mint(addr1, mintAmount);
    expect(await securityTokenContract.totalSupply()).to.equal(mintAmount);
    console.log("contact supply limit ", await securityTokenContract.totalSupply());


  })




});


