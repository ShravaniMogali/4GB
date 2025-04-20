// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SupplyChain
 * @dev Contract for tracking farm-to-table products through the supply chain
 */
contract SupplyChain {
    struct Consignment {
        string productName;
        string productionDate;
        string farmLocation;
        string producerInfo;
        string currentStatus;
        string currentLocation;
        address producer;
        uint256 timestamp;
    }
    
    struct StatusUpdate {
        string status;
        string location;
        address handler;
        uint256 timestamp;
    }
    
    // Mapping from consignment ID to consignment data
    mapping(bytes32 => Consignment) private consignments;
    
    // Mapping from consignment ID to its status updates history
    mapping(bytes32 => StatusUpdate[]) private statusUpdates;
    
    // Events
    event ConsignmentCreated(
        bytes32 indexed consignmentId,
        string productName,
        address indexed producer,
        uint256 timestamp
    );
    
    event StatusUpdated(
        bytes32 indexed consignmentId,
        string status,
        string location,
        address indexed handler,
        uint256 timestamp
    );
    
    constructor() {
        // Initialization if needed
    }
    
    /**
     * @dev Create a new consignment in the supply chain
     * @param _consignmentId Unique identifier for the consignment
     * @param _productName Name of the product
     * @param _productionDate Date of production
     * @param _farmLocation Location of the farm
     * @param _producerInfo Information about the producer
     */
    function createConsignment(
        bytes32 _consignmentId,
        string memory _productName,
        string memory _productionDate,
        string memory _farmLocation,
        string memory _producerInfo
    ) public {
        // Ensure consignment doesn't already exist
        require(consignments[_consignmentId].producer == address(0), "Consignment already exists");
        
        // Create new consignment
        consignments[_consignmentId] = Consignment({
            productName: _productName,
            productionDate: _productionDate,
            farmLocation: _farmLocation,
            producerInfo: _producerInfo,
            currentStatus: "CREATED",
            currentLocation: _farmLocation,
            producer: msg.sender,
            timestamp: block.timestamp
        });
        
        // Add initial status update
        statusUpdates[_consignmentId].push(StatusUpdate({
            status: "CREATED",
            location: _farmLocation,
            handler: msg.sender,
            timestamp: block.timestamp
        }));
        
        // Emit event
        emit ConsignmentCreated(_consignmentId, _productName, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update the status of an existing consignment
     * @param _consignmentId Unique identifier for the consignment
     * @param _status New status
     * @param _location New location
     */
    function updateStatus(
        bytes32 _consignmentId,
        string memory _status,
        string memory _location
    ) public {
        // Ensure consignment exists
        require(consignments[_consignmentId].producer != address(0), "Consignment does not exist");
        
        // Update consignment status and location
        consignments[_consignmentId].currentStatus = _status;
        consignments[_consignmentId].currentLocation = _location;
        
        // Add status update to history
        statusUpdates[_consignmentId].push(StatusUpdate({
            status: _status,
            location: _location,
            handler: msg.sender,
            timestamp: block.timestamp
        }));
        
        // Emit event
        emit StatusUpdated(_consignmentId, _status, _location, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get consignment details
     * @param _consignmentId Unique identifier for the consignment
     * @return Consignment details
     */
    function getConsignment(bytes32 _consignmentId) public view returns (Consignment memory) {
        return consignments[_consignmentId];
    }
    
    /**
     * @dev Get status update history for a consignment
     * @param _consignmentId Unique identifier for the consignment
     * @return Array of status updates
     */
    function getStatusUpdates(bytes32 _consignmentId) public view returns (StatusUpdate[] memory) {
        return statusUpdates[_consignmentId];
    }
} 