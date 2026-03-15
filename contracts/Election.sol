// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {
    address public owner; // NEW: Owner role
    address public admin;
    uint256 public electionId; // Current election session ID
    
    struct Candidate {
        uint256 candidateId;
        string header;
        string slogan;
        uint256 voteCount;
    }

    struct Voter {
        address voterAddress;
        string name;
        string phone;
        bool isVerified;
        bool hasVoted;
        bool isRegistered;
    }

    struct ElectionDetails {
        string adminName;
        string adminEmail;
        string adminTitle;
        string electionTitle;
        string organizationTitle;
    }

    // Mapping: electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) public candidateDetails;
    // Mapping: electionId => candidateCount
    mapping(uint256 => uint256) public candidateCount;
    
    // Mapping: electionId => voterAddress => Voter
    mapping(uint256 => mapping(address => Voter)) public voterDetails;
    // Mapping: electionId => list of voter addresses
    mapping(uint256 => address[]) public voters;
    // Mapping: electionId => voterCount
    mapping(uint256 => uint256) public voterCount;
    
    // Mapping: electionId => ElectionDetails
    mapping(uint256 => ElectionDetails) public electionDetails;
    
    mapping(uint256 => bool) public start;
    mapping(uint256 => bool) public end;

    constructor() {
        owner = msg.sender; // NEW: Deployer becomes Owner
        admin = msg.sender;
        electionId = 0;
    }

    function getAdmin() public view returns (address) {
        return admin;
    }

    // NEW: onlyOwner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    // Start a brand new election cycle (Restart)
    function startNewElection() public onlyAdmin {
        electionId += 1;
    }

    // --- NEW: Owner functions ---
    
    // Owner can transfer ownership to another address
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner address cannot be zero");
        owner = newOwner;
    }

    // Owner can assign or change the Admin
    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "New admin address cannot be zero");
        admin = newAdmin;
    }
    
    // ----------------------------

    // Adding new candidates for the current electionId
    function addCandidate(string memory _header, string memory _slogan)
        public
        onlyAdmin
    {
        uint256 currentId = candidateCount[electionId];
        Candidate memory newCandidate =
            Candidate({
                candidateId: currentId,
                header: _header,
                slogan: _slogan,
                voteCount: 0
            });
        candidateDetails[electionId][currentId] = newCandidate;
        candidateCount[electionId] += 1;
    }

    function setElectionDetails(
        string memory _adminName,
        string memory _adminEmail,
        string memory _adminTitle,
        string memory _electionTitle,
        string memory _organizationTitle
    )
        public
        onlyAdmin
    {
        electionDetails[electionId] = ElectionDetails(
            _adminName,
            _adminEmail,
            _adminTitle,
            _electionTitle,
            _organizationTitle
        );
        start[electionId] = true;
        end[electionId] = false;
    }

    // Get Elections details for current session
    function getElectionDetails()
    public
    view
    returns(string memory adminName, 
    string memory adminEmail, 
    string memory adminTitle, 
    string memory electionTitle, 
    string memory organizationTitle){
        ElectionDetails memory ed = electionDetails[electionId];
        return(ed.adminName, 
        ed.adminEmail, 
        ed.adminTitle, 
        ed.electionTitle, 
        ed.organizationTitle);
    }

    function getTotalCandidate() public view returns (uint256) {
        return candidateCount[electionId];
    }

    function getTotalVoter() public view returns (uint256) {
        return voterCount[electionId];
    }

    // Request to be added as voter for current session
    function registerAsVoter(string memory _name, string memory _phone) public {
        require(!voterDetails[electionId][msg.sender].isRegistered, "Already registered in this session");
        Voter memory newVoter =
            Voter({
                voterAddress: msg.sender,
                name: _name,
                phone: _phone,
                hasVoted: false,
                isVerified: false,
                isRegistered: true
            });
        voterDetails[electionId][msg.sender] = newVoter;
        voters[electionId].push(msg.sender);
        voterCount[electionId] += 1;
    }

    // Verify voter for current session
    function verifyVoter(bool _verifedStatus, address voterAddress)
        public
        onlyAdmin
    {
        voterDetails[electionId][voterAddress].isVerified = _verifedStatus;
    }

    // Vote in the current session
    function vote(uint256 candidateId) public {
        require(voterDetails[electionId][msg.sender].hasVoted == false, "Already voted");
        require(voterDetails[electionId][msg.sender].isVerified == true, "Not verified");
        require(start[electionId] == true, "Election not started");
        require(end[electionId] == false, "Election ended");
        candidateDetails[electionId][candidateId].voteCount += 1;
        voterDetails[electionId][msg.sender].hasVoted = true;
    }

    function endElection() public onlyAdmin {
        end[electionId] = true;
        start[electionId] = false;
    }

    function getStart() public view returns (bool) {
        return start[electionId];
    }

    function getEnd() public view returns (bool) {
        return end[electionId];
    }
}
