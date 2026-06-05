// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @title ScholarshipFunding
 * @dev Manages ETH donations and admin-controlled scholarship disbursements.
 */
contract ScholarshipFunding {
    address public admin;
    uint public totalDonations;
    uint public studentCount;

    struct Student {
        uint id;
        string name;
        address payable wallet;
        bool isRegistered;
    }

    mapping(address => Student) public students;

    event Donated(address indexed donor, uint amount);
    event FundsReleased(address indexed recipient, uint amount);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Accept ETH donations from any address.
     */
    function donate() public payable {
        require(msg.value > 0, "Donation must be greater than zero");
        totalDonations += msg.value;
        emit Donated(msg.sender, msg.value);
    }

    /**
     * @dev Register the caller as a scholarship applicant.
     * @param _name Display name for the student profile.
     */
    function applyForScholarship(string memory _name) public {
        require(!students[msg.sender].isRegistered, "Already registered");
        studentCount++;
        students[msg.sender] = Student({
            id: studentCount,
            name: _name,
            wallet: payable(msg.sender),
            isRegistered: true
        });
    }

    /**
     * @dev Release scholarship funds to a recipient. Admin-only.
     * @param _recipient Payable address receiving the disbursement.
     * @param _amount Amount in wei to transfer.
     */
    function releaseFunds(address payable _recipient, uint _amount) public {
        require(msg.sender == admin, "Only admin can release funds");
        require(address(this).balance >= _amount, "Insufficient contract balance");
        totalDonations -= _amount;
        _recipient.transfer(_amount);
        emit FundsReleased(_recipient, _amount);
    }
}
