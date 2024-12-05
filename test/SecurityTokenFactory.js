const { expect } = require("chai");
const { ethers } = require("hardhat");


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
        const params =  [
            name,symbol,decimals,supply,[100000,10,true,true,[10,10]]
          ]
        const tx = await factory.createSecurityToken(params);
        
        const receipt = await tx.wait();

        const event = receipt.logs.at(-1).args;
        console.log("Security Token Created:", event[0]);
          
        expect(event[3]).to.equal(name);
    })

});