// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {AetherGuardFactory} from "../src/AetherGuardFactory.sol";

contract DeployAetherGuard is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        AetherGuardFactory factory = new AetherGuardFactory();
        console.log("AetherGuardFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
