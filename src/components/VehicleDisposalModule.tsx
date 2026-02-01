// Vehicle Disposal Module - Defined per vehicle-disposal-module.md
import { useState, useEffect } from 'react';
import { DisposalRequest, DisposalAuction, Bid, Vehicle } from '../types';
import Modal from './Modal';
import { Input, Select, Textarea, Button, Badge, Card } from './ui';
import { disposalService, vehicleService } from '../services/supabaseService';
import { notificationService } from '../services/notificationService';
import { auditLogService } from '../services/auditLogService';

export default function VehicleDisposalModule() {
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);
  const [auctions, setAuctions] = useState<DisposalAuction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DisposalRequest | undefined>();
  const [selectedAuction, setSelectedAuction] = useState<DisposalAuction | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<DisposalRequest | undefined>();
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [isAuctionDetailsModalOpen, setIsAuctionDetailsModalOpen] = useState(false);
  const [selectedAuctionForDetails, setSelectedAuctionForDetails] = useState<DisposalAuction | undefined>();

  // Format number with thousand separators
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format currency with Php prefix
  const formatCurrency = (amount: number): string => {
    return `Php ${formatNumber(amount, 2)}`;
  };
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [requestsData, vehiclesData] = await Promise.all([
          disposalService.getAllRequests(),
          vehicleService.getAll(),
        ]);
        setDisposalRequests(requestsData);
        setVehicles(vehiclesData);
        console.log('Loaded disposal requests:', requestsData.length, 'vehicles:', vehiclesData.length);
        
        // Load auctions and bids for all requests
        const allAuctions: DisposalAuction[] = [];
        const allBids: Bid[] = [];
        
        for (const request of requestsData) {
          const auctionsForRequest = await disposalService.getAuctionsByDisposal(request.id);
          allAuctions.push(...auctionsForRequest);
          
          for (const auction of auctionsForRequest) {
            const bidsForAuction = await disposalService.getBidsByAuction(auction.id);
            allBids.push(...bidsForAuction);
          }
        }
        
        // Calculate current highest bid and total bids for each auction
        const auctionsWithBidInfo = allAuctions.map(auction => {
          const auctionBids = allBids.filter(bid => bid.auction_id === auction.id);
          const highestBid = auctionBids.length > 0 
            ? Math.max(...auctionBids.map(bid => bid.bid_amount)) 
            : 0;
          
          return {
            ...auction,
            current_highest_bid: highestBid,
            total_bids: auctionBids.length
          };
        });
        
        setAuctions(auctionsWithBidInfo);
        setBids(allBids);
        console.log('Loaded auctions:', auctionsWithBidInfo.length, 'bids:', allBids.length);
      } catch (error) {
        console.error('Error loading disposal data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    const handleVehiclesUpdate = ((event: CustomEvent) => setVehicles(event.detail)) as EventListener;
    window.addEventListener('vehiclesUpdated', handleVehiclesUpdate);
    return () => window.removeEventListener('vehiclesUpdated', handleVehiclesUpdate);
  }, []);

  // Disposal Request Form - per markdown Disposal Request Form section (9 fields)
  const DisposalRequestForm = ({ initialData, onSubmit, onClose }: any) => {
    const [formData, setFormData] = useState({
      disposal_number: initialData?.disposal_number || `DSP-${Date.now()}`,
      vehicle_id: initialData?.vehicle_id || '',
      requested_by: initialData?.requested_by || '',
      disposal_reason: initialData?.disposal_reason || 'end_of_life',
      recommended_method: initialData?.recommended_method || 'auction',
      condition_rating: initialData?.condition_rating || 'good',
      current_mileage: initialData?.current_mileage || 0,
      estimated_value: initialData?.estimated_value || 0,
      request_date: initialData?.request_date || new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
      const getCurrentUser = () => {
        const userId = localStorage.getItem('user_id');
        if (userId && !formData.requested_by) {
          setFormData(prev => ({ ...prev, requested_by: userId }));
        }
      };
      getCurrentUser();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Ensure we have the current user ID
      if (!formData.requested_by) {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          onSubmit({ ...formData, requested_by: userId });
        } else {
          alert('Unable to get current user. Please try logging in again.');
        }
      } else {
        onSubmit(formData);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Disposal Number (text, auto-generated) */}
          <div className="col-span-2">
            <Input
              label="Disposal Number"
              name="disposal_number"
              value={formData.disposal_number}
              onChange={(e) => setFormData({...formData, disposal_number: e.target.value})}
              required
            />
          </div>

          {/* Vehicle (select, required) */}
          <div className="col-span-2">
            <Select
              label={<>Vehicle <span className="text-red-600">*</span></>}
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
              required
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number}{v.conduction_number ? ` (${v.conduction_number})` : ''} - {v.make} {v.model} ({v.year})</option>
              ))}
            </Select>
          </div>

          {/* Reason for Disposal (select, required) */}
          <div>
            <Select
              label={<>Reason for Disposal <span className="text-red-600">*</span></>}
              name="disposal_reason"
              value={formData.disposal_reason}
              onChange={(e) => setFormData({...formData, disposal_reason: e.target.value as any})}
              required
            >
              <option value="end_of_life">End of Life</option>
              <option value="excessive_maintenance">Excessive Maintenance</option>
              <option value="accident_damage">Accident Damage</option>
              <option value="upgrade">Upgrade</option>
              <option value="policy_change">Policy Change</option>
            </Select>
          </div>

          {/* Condition Rating (select, required) */}
          <div>
            <Select
              label={<>Condition Rating <span className="text-red-600">*</span></>}
              name="condition_rating"
              value={formData.condition_rating}
              onChange={(e) => setFormData({...formData, condition_rating: e.target.value as any})}
              required
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="salvage">Salvage</option>
            </Select>
          </div>

          {/* Current Mileage (number, required) */}
          <div>
            <Input
              label={<>Current Mileage <span className="text-red-600">*</span></>}
              name="current_mileage"
              type="number"
              value={formData.current_mileage}
              onChange={(e) => setFormData({...formData, current_mileage: parseInt(e.target.value)})}
              required
              min="0"
            />
          </div>

          {/* Estimated Value (number, required) */}
          <div>
            <Input
              label={<>Estimated Value <span className="text-red-600">*</span></>}
              name="estimated_value"
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value)})}
              required
              step="0.01"
              min="0"
            />
          </div>

          {/* Recommended Method (select, required) */}
          <div>
            <Select
              label={<>Recommended Method <span className="text-red-600">*</span></>}
              name="recommended_method"
              value={formData.recommended_method}
              onChange={(e) => setFormData({...formData, recommended_method: e.target.value as any})}
              required
            >
              <option value="auction">Auction</option>
              <option value="best_offer">Best Offer</option>
              <option value="trade_in">Trade-in</option>
              <option value="scrap">Scrap</option>
              <option value="donation">Donation</option>
            </Select>
          </div>

          {/* Request Date (date, required) */}
          <div>
            <Input
              label={<>Request Date <span className="text-red-600">*</span></>}
              name="request_date"
              type="date"
              value={formData.request_date}
              onChange={(e) => setFormData({...formData, request_date: e.target.value})}
              required
            />
          </div>
        </div>

        {/* Actions: Submit Request (primary, submit) */}
        <div className="flex justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">Submit Request</Button>
        </div>
      </form>
    );
  };

  // Auction Setup Form - per markdown Auction Setup Form section (9 fields)
  const AuctionSetupForm = ({ request, onSubmit, onClose }: any) => {
    const [formData, setFormData] = useState({
      disposal_id: request.id,
      auction_type: 'online' as 'public' | 'sealed_bid' | 'online',
      starting_price: request.estimated_value * 0.7,
      reserve_price: request.estimated_value * 0.85,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_bids: 0,
      auction_status: 'scheduled' as 'scheduled' | 'active' | 'closed' | 'awarded' | 'cancelled',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Validate auction duration minimum 7 days per business rules
      const duration = (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24);
      if (duration < 7) {
        alert('Auction duration must be at least 7 days');
        return;
      }
      // Validate reserve_price >= starting_price per business rules
      if (formData.reserve_price && formData.reserve_price < formData.starting_price) {
        alert('Reserve price must be greater than or equal to starting price');
        return;
      }
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Auction Type (select, required) */}
          <div>
            <Select
              label={<>Auction Type <span className="text-red-600">*</span></>}
              name="auction_type"
              value={formData.auction_type}
              onChange={(e) => setFormData({...formData, auction_type: e.target.value as any})}
              required
            >
              <option value="public">Public</option>
              <option value="sealed_bid">Sealed Bid</option>
              <option value="online">Online</option>
            </Select>
          </div>

          {/* Starting Price (number, required) */}
          <div>
            <Input
              label={<>Starting Price <span className="text-red-600">*</span></>}
              name="starting_price"
              type="number"
              value={formData.starting_price}
              onChange={(e) => setFormData({...formData, starting_price: parseFloat(e.target.value)})}
              required
              min="0"
            />
          </div>

          {/* Reserve Price (number, optional) */}
          <div>
            <Input
              label="Reserve Price"
              name="reserve_price"
              type="number"
              value={formData.reserve_price}
              onChange={(e) => setFormData({...formData, reserve_price: parseFloat(e.target.value)})}
              min={formData.starting_price}
            />
          </div>

          {/* Start Date (date, required) */}
          <div>
            <Input
              label={<>Start Date <span className="text-red-600">*</span></>}
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              required
            />
          </div>

          {/* End Date (date, required, min 7 days) */}
          <div className="col-span-2">
            <Input
              label={<>End Date <span className="text-red-600">*</span> (min 7 days)</>}
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              required
            />
          </div>
        </div>

        {/* Actions: Create Auction (primary, submit) */}
        <div className="flex justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">Create Auction</Button>
        </div>
      </form>
    );
  };

  // Auction Details View - Shows vehicle and bidder information for awarded auctions
  const AuctionDetailsView = ({ auction }: { auction: DisposalAuction }) => {
    const disposalRequest = disposalRequests.find(r => r.id === auction.disposal_id);
    const vehicle = vehicles.find(v => v.id === disposalRequest?.vehicle_id);
    const winningBid = bids.find(b => b.id === auction.winner_id);
    const allAuctionBids = bids.filter(b => b.auction_id === auction.id).sort((a, b) => b.bid_amount - a.bid_amount);

    return (
      <div className="space-y-6">
        {/* Auction Summary */}
        <div className="bg-accent-soft border border-border-muted rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Auction Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Auction Type</p>
              <p className="text-base font-medium text-text-primary capitalize">{auction.auction_type}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Status</p>
              <p className="text-base font-medium text-text-primary">
                <Badge variant="success">Awarded</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Starting Price</p>
              <p className="text-base font-medium text-text-primary">{formatCurrency(auction.starting_price)}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Winning Bid</p>
              <p className="text-base font-medium text-emerald-600">{formatCurrency(auction.winning_bid || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Start Date</p>
              <p className="text-base font-medium text-text-primary">{new Date(auction.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">End Date</p>
              <p className="text-base font-medium text-text-primary">{new Date(auction.end_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-bg-elevated border border-border-muted rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Vehicle Information</h3>
          {vehicle ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Plate Number</p>
                <p className="text-base font-medium text-text-primary">{vehicle.plate_number}</p>
              </div>
              {vehicle.conduction_number && (
                <div>
                  <p className="text-sm text-text-secondary">Conduction Number</p>
                  <p className="text-base font-medium text-text-primary">{vehicle.conduction_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-text-secondary">Make & Model</p>
                <p className="text-base font-medium text-text-primary">{vehicle.make} {vehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Year</p>
                <p className="text-base font-medium text-text-primary">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">VIN</p>
                <p className="text-base font-medium text-text-primary">{vehicle.vin || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Ownership Type</p>
                <p className="text-base font-medium text-text-primary">{vehicle.ownership_type}</p>
              </div>
              {disposalRequest && (
                <>
                  <div>
                    <p className="text-sm text-text-secondary">Condition Rating</p>
                    <p className="text-base font-medium text-text-primary capitalize">{disposalRequest.condition_rating}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Mileage</p>
                    <p className="text-base font-medium text-text-primary">{disposalRequest.current_mileage.toLocaleString()} km</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">Vehicle information not available</p>
          )}
        </div>

        {/* Winning Bidder Information */}
        <div className="bg-bg-elevated border border-border-muted rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Winning Bidder</h3>
          {winningBid ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Bidder Name</p>
                <p className="text-base font-medium text-text-primary">{winningBid.bidder_name}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Contact</p>
                <p className="text-base font-medium text-text-primary">{winningBid.bidder_contact}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Winning Bid Amount</p>
                <p className="text-base font-medium text-emerald-600">{formatCurrency(winningBid.bid_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Bid Date</p>
                <p className="text-base font-medium text-text-primary">{new Date(winningBid.bid_date).toLocaleString()}</p>
              </div>
              {winningBid.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-text-secondary">Notes</p>
                  <p className="text-base font-medium text-text-primary">{winningBid.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">Bidder information not available</p>
          )}
        </div>

        {/* All Bids History */}
        <div className="bg-bg-elevated border border-border-muted rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Bid History ({allAuctionBids.length} bids)</h3>
          {allAuctionBids.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-muted">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Bidder</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-muted">
                  {allAuctionBids.map((bid, index) => (
                    <tr key={bid.id} className={bid.id === auction.winner_id ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}>
                      <td className="px-3 py-2 text-sm text-text-primary">{bid.bidder_name}</td>
                      <td className="px-3 py-2 text-sm font-medium text-text-primary">{formatCurrency(bid.bid_amount)}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{new Date(bid.bid_date).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm">
                        {bid.id === auction.winner_id ? (
                          <Badge variant="success">Winner</Badge>
                        ) : index === 0 ? (
                          <Badge variant="default">Highest</Badge>
                        ) : (
                          <Badge variant="default">Outbid</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-secondary">No bids recorded</p>
          )}
        </div>
      </div>
    );
  };

  // Bid Submission Form - per markdown Bid Submission Form section (6 fields)
  const BidSubmissionForm = ({ auction, onSubmit, onClose }: any) => {
    const currentHighestBid = bids.filter(b => b.auction_id === auction.id).reduce((max, b) => Math.max(max, b.bid_amount), 0);
    const defaultBidIncrement = 1000; // Default bid increment
    const minimumBid = Math.max(auction.starting_price, currentHighestBid + defaultBidIncrement);

    const [formData, setFormData] = useState({
      auction_id: auction.id,
      bidder_name: '',
      bidder_contact: '',
      bid_amount: minimumBid,
      bid_date: new Date().toISOString(),
      is_valid: true,
      notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Validate bid amount per business rules
      if (formData.bid_amount < minimumBid) {
        alert(`Minimum bid amount is ${formatCurrency(minimumBid)}`);
        return;
      }
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-accent-soft border border-border-muted rounded p-3 mb-4">
          <p className="text-sm text-text-primary">
            <strong>Current Highest Bid:</strong> {formatCurrency(currentHighestBid)}<br />
            <strong>Minimum Next Bid:</strong> {formatCurrency(minimumBid)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Bidder Name (text, required) */}
          <div className="col-span-2">
            <Input
              label={<>Bidder Name <span className="text-red-600">*</span></>}
              name="bidder_name"
              value={formData.bidder_name}
              onChange={(e) => setFormData({...formData, bidder_name: e.target.value})}
              required
            />
          </div>

          {/* Bidder Contact (text, required) */}
          <div className="col-span-2">
            <Input
              label={<>Bidder Contact (Email/Phone) <span className="text-red-600">*</span></>}
              name="bidder_contact"
              value={formData.bidder_contact}
              onChange={(e) => setFormData({...formData, bidder_contact: e.target.value})}
              required
              placeholder="email@example.com or +63 XXX XXX XXXX"
            />
          </div>

          {/* Bid Amount (number, required, >= minimum bid) */}
          <div className="col-span-2">
            <Input
              label={<>Bid Amount <span className="text-red-600">*</span></>}
              name="bid_amount"
              type="number"
              value={formData.bid_amount}
              onChange={(e) => setFormData({...formData, bid_amount: parseFloat(e.target.value)})}
              required
              step="0.01"
              min={minimumBid}
            />
          </div>

          {/* Notes (textarea, optional) */}
          <div className="col-span-2">
            <Textarea
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              placeholder="Any additional information..."
            />
          </div>
        </div>

        {/* Actions: Submit Bid (primary, submit) */}
        <div className="flex justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">Submit Bid</Button>
        </div>
      </form>
    );
  };

  // Action: Submit Request (primary) - per markdown
  const handleSaveDisposalRequest = async (requestData: any) => {
    try {
      if (editingRequest) {
        // Update existing request
        const updated = await disposalService.updateRequest(editingRequest.id, requestData);
        setDisposalRequests(disposalRequests.map(r => r.id === updated.id ? updated : r));
        setIsEditRequestModalOpen(false);
        setEditingRequest(undefined);
        notificationService.success(
          'Disposal Request Updated',
          `Disposal request ${updated.disposal_number} has been updated`
        );
        await auditLogService.createLog(
          'Disposal Request Updated',
          `Updated disposal request ${updated.disposal_number}`
        );
      } else {
        // Create new request
        const newRequest = await disposalService.createRequest(requestData);
        setDisposalRequests([newRequest, ...disposalRequests]);
        setIsRequestModalOpen(false);
      
        notificationService.success(
          'Disposal Request Created',
          `Disposal request ${newRequest.disposal_number} has been submitted`
        );
        await auditLogService.createLog(
          'Disposal Request Created',
          `Created disposal request ${newRequest.disposal_number} for vehicle ${requestData.vehicle_id}`
        );
      }
    } catch (error: any) {
      console.error('Failed to save disposal request:', error);
      notificationService.error('Failed to Create Request', error.message || 'Unable to save disposal request.');
      alert(error.message || 'Failed to save disposal request. Please try again.');
    }
  };

  // Action: Approve Request (success) - per markdown
  const handleApproveRequest = async (id: string) => {
    try {
      const request = disposalRequests.find(r => r.id === id);
      if (!request) {
        notificationService.error('Error', 'Disposal request not found');
        return;
      }

      const updated = await disposalService.updateRequest(id, {
        approval_status: 'approved',
        status: 'listed',
      });
      setDisposalRequests(disposalRequests.map(r => r.id === updated.id ? updated : r));
      
      // Update vehicle status to disposed
      try {
        await vehicleService.update(request.vehicle_id, { status: 'disposed' });
        
        // Update local vehicles state
        setVehicles(vehicles.map(v => 
          v.id === request.vehicle_id ? { ...v, status: 'disposed' } : v
        ));
        
        // Dispatch event to update vehicles in other components
        window.dispatchEvent(new CustomEvent('vehiclesUpdated', { 
          detail: vehicles.map(v => 
            v.id === request.vehicle_id ? { ...v, status: 'disposed' } : v
          )
        }));
      } catch (vehicleError: any) {
        console.error('Failed to update vehicle status:', vehicleError);
        // Continue with success notification even if vehicle update fails
      }
      
      notificationService.success(
        'Request Approved',
        `Disposal request ${request?.disposal_number} has been approved and vehicle marked as disposed`
      );
      await auditLogService.createLog(
        'Disposal Request Approved',
        `Approved disposal request ${request?.disposal_number} and marked vehicle as disposed`
      );
    } catch (error: any) {
      console.error('Failed to approve disposal request:', error);
      notificationService.error('Failed to Approve', error.message || 'Unable to approve request.');
      alert(error.message || 'Failed to approve disposal request. Please try again.');
    }
  };

  // Action: Create Auction (primary) - per markdown
  const handleCreateAuction = async (auctionData: any) => {
    try {
      const newAuction = await disposalService.createAuction(auctionData);
      setAuctions([newAuction, ...auctions]);
      // Update disposal request status
      const updated = await disposalService.updateRequest(auctionData.disposal_id, {
        status: 'bidding_open',
      });
      setDisposalRequests(disposalRequests.map(r => r.id === updated.id ? updated : r));
      setIsAuctionModalOpen(false);
      setSelectedRequest(undefined);
      
      notificationService.success(
        'Auction Created',
        `${newAuction.auction_type} auction created with starting price ${formatCurrency(newAuction.starting_price)}`
      );
      await auditLogService.createLog(
        'Auction Created',
        `Created ${newAuction.auction_type} auction for disposal request`
      );
    } catch (error: any) {
      console.error('Failed to create auction:', error);
      notificationService.error('Failed to Create Auction', error.message || 'Unable to create auction.');
      alert(error.message || 'Failed to create auction. Please try again.');
    }
  };

  // Action: Submit Bid (primary) - per markdown
  const handleSubmitBid = async (bidData: any) => {
    try {
      const newBid = await disposalService.placeBid(bidData);
      setBids([newBid, ...bids]);
      // Reload auction data to get updated bid count
      const auctionBids = await disposalService.getBidsByAuction(bidData.auction_id);
      setAuctions(auctions.map(a =>
        a.id === bidData.auction_id
          ? { ...a, total_bids: auctionBids.length, current_highest_bid: Math.max(...auctionBids.map(b => b.bid_amount)) }
          : a
      ));
      setIsBidModalOpen(false);
      setSelectedAuction(undefined);
      
      notificationService.success(
        'Bid Submitted',
        `Bid of ${formatCurrency(newBid.bid_amount)} has been placed successfully`
      );
      await auditLogService.createLog(
        'Bid Submitted',
        `Placed bid of ${formatCurrency(newBid.bid_amount)} by ${newBid.bidder_name}`
      );
    } catch (error: any) {
      console.error('Failed to submit bid:', error);
      notificationService.error('Failed to Submit Bid', error.message || 'Unable to submit bid.');
      alert(error.message || 'Failed to submit bid. Please try again.');
    }
  };

  // Action: Start Auction
  const handleStartAuction = async (auctionId: string) => {
    try {
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) return;
      
      await disposalService.updateAuction(auctionId, { auction_status: 'active' });
      setAuctions(auctions.map(a => a.id === auctionId ? { ...a, auction_status: 'active' } : a));
      
      notificationService.success(
        'Auction Started',
        `${auction.auction_type} auction is now active`
      );
      await auditLogService.createLog(
        'Auction Started',
        `Started ${auction.auction_type} auction`
      );
    } catch (error: any) {
      console.error('Failed to start auction:', error);
      notificationService.error('Failed to Start Auction', error.message || 'Unable to start auction.');
    }
  };

  // Action: Close Auction (success) - per markdown
  const handleCloseAuction = async (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) {
      console.error('Auction not found:', auctionId);
      return;
    }

    const auctionBids = bids.filter(b => b.auction_id === auctionId);
    console.log('Closing auction:', auctionId, 'Found bids:', auctionBids.length);
    
    if (auctionBids.length === 0) {
      alert('Cannot close auction with no bids');
      return;
    }

    const winningBid = auctionBids.reduce((max, b) => b.bid_amount > max.bid_amount ? b : max, auctionBids[0]);
    
    // Check if reserve price met per business rules
    if (auction.reserve_price && winningBid.bid_amount < auction.reserve_price) {
      alert(`Reserve price not met. Reserve: ${formatCurrency(auction.reserve_price)}, Highest Bid: ${formatCurrency(winningBid.bid_amount)}`);
      return;
    }

    // Confirm before closing
    if (!window.confirm(`Close auction with winning bid of ${formatCurrency(winningBid.bid_amount)} from ${winningBid.bidder_name}?`)) {
      return;
    }

    try {
      console.log('Updating auction status to closed...');
      await disposalService.updateAuction(auctionId, { 
        auction_status: 'closed', 
        winner_id: winningBid.id, 
        winning_bid: winningBid.bid_amount 
      });
      
      setAuctions(auctions.map(a =>
        a.id === auctionId
          ? { ...a, auction_status: 'closed', winner_id: winningBid.bidder_name, winning_bid: winningBid.bid_amount }
          : a
      ));
      
      // Update disposal request status
      console.log('Updating disposal request status to sold...');
      const updatedRequest = await disposalService.updateRequest(auction.disposal_id, { status: 'sold' });
      setDisposalRequests(disposalRequests.map(r =>
        r.id === auction.disposal_id ? updatedRequest : r
      ));
      
      notificationService.success(
        'Auction Closed',
        `Auction closed with winning bid of ${formatCurrency(winningBid.bid_amount)}`
      );
      await auditLogService.createLog(
        'Auction Closed',
        `Closed auction with winning bid of ${formatCurrency(winningBid.bid_amount)} by ${winningBid.bidder_name}`
      );
      console.log('Auction closed successfully');
    } catch (error: any) {
      console.error('Failed to close auction:', error);
      notificationService.error('Failed to Close Auction', error.message || 'Unable to close auction.');
      alert(`Error closing auction: ${error.message || 'Unknown error'}`);
    }
  };

  // Action: Award Auction
  const handleAwardAuction = async (auctionId: string) => {
    try {
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) return;
      
      await disposalService.updateAuction(auctionId, { auction_status: 'awarded' });
      setAuctions(auctions.map(a => a.id === auctionId ? { ...a, auction_status: 'awarded' } : a));
      
      // Update disposal request status
      const updatedRequest = await disposalService.updateRequest(auction.disposal_id, { status: 'transferred' });
      setDisposalRequests(disposalRequests.map(r =>
        r.id === auction.disposal_id ? updatedRequest : r
      ));
      
      notificationService.success(
        'Auction Awarded',
        `Vehicle awarded to ${auction.winner_id}`
      );
      await auditLogService.createLog(
        'Auction Awarded',
        `Awarded vehicle to ${auction.winner_id}`
      );
    } catch (error: any) {
      console.error('Failed to award auction:', error);
      notificationService.error('Failed to Award Auction', error.message || 'Unable to award auction.');
    }
  };

  // Action: Cancel Auction
  const handleCancelAuction = async (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;
    
    if (!window.confirm('Are you sure you want to cancel this auction?')) {
      return;
    }
    
    try {
      await disposalService.updateAuction(auctionId, { auction_status: 'cancelled' });
      setAuctions(auctions.map(a => a.id === auctionId ? { ...a, auction_status: 'cancelled' } : a));
      
      // Revert disposal request status
      const updatedRequest = await disposalService.updateRequest(auction.disposal_id, { status: 'listed' });
      setDisposalRequests(disposalRequests.map(r =>
        r.id === auction.disposal_id ? updatedRequest : r
      ));
      
      notificationService.success(
        'Auction Cancelled',
        `Auction has been cancelled`
      );
      await auditLogService.createLog(
        'Auction Cancelled',
        `Cancelled ${auction.auction_type} auction`
      );
    } catch (error: any) {
      console.error('Failed to cancel auction:', error);
      notificationService.error('Failed to Cancel Auction', error.message || 'Unable to cancel auction.');
    }
  };

  // Calculate stats
  const pendingRequests = disposalRequests.filter(r => r.approval_status === 'pending').length;
  const activeAuctions = auctions.filter(a => a.auction_status === 'active').length;
  const totalDisposals = disposalRequests.filter(r => r.status === 'transferred').length;
  const totalRevenue = auctions.reduce((sum, a) => sum + (a.winning_bid || 0), 0);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Pending Requests</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{pendingRequests}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Active Auctions</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{activeAuctions}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Disposals</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{totalDisposals}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Revenue</p>
              <p className="text-2xl font-bold text-text-primary mt-1">Php {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <div className="p-6 border-b border-border-muted">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Vehicle Disposal Management</h2>
              <p className="text-sm text-text-secondary mt-1">Manage disposal requests and auctions</p>
            </div>
            {/* Action: Submit Disposal Request (primary) */}
            <Button onClick={() => setIsRequestModalOpen(true)}                 
                variant="primary"                 
                size="md"
                className="inline-flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Disposal Request
            </Button>
          </div>
        </div>

        {/* Disposal Requests Table */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Disposal Requests</h3>
          {disposalRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">No disposal requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-muted">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Est. Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Approval</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-bg-secondary divide-y divide-border-muted">
                  {disposalRequests.map((request) => {
                    const vehicle = vehicles.find(v => v.id === request.vehicle_id);
                    const auction = auctions.find(a => a.disposal_id === request.id);
                    return (
                      <tr 
                        key={request.id} 
                        className="hover:bg-bg-elevated cursor-pointer transition-colors"
                        onDoubleClick={() => {
                          setEditingRequest(request);
                          setIsEditRequestModalOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                          {vehicle ? `${vehicle.plate_number}${vehicle.conduction_number ? ` (${vehicle.conduction_number})` : ''} - ${vehicle.make} ${vehicle.model}` : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary capitalize">{request.disposal_reason.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(request.estimated_value)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary capitalize">{request.recommended_method.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={
                            request.status === 'pending_approval' ? 'warning' :
                            request.status === 'listed' ? 'success' :
                            request.status === 'bidding_open' ? 'accent' :
                            request.status === 'sold' ? 'success' :
                            request.status === 'transferred' ? 'success' :
                            'danger'
                          }>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={
                            request.approval_status === 'pending' ? 'warning' :
                            request.approval_status === 'approved' ? 'success' :
                            'danger'
                          }>
                            {request.approval_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm space-x-2">
                          {request.approval_status === 'pending' && (
                            <Button size="sm" variant="primary" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                          )}
                          {request.approval_status === 'approved' && !auction && (
                            <Button size="sm" variant="primary" onClick={() => { setSelectedRequest(request); setIsAuctionModalOpen(true); }}>Create Auction</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Auctions Table */}
        <div className="p-6 border-t border-border-muted">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Auctions</h3>
          {auctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">No auctions created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-muted">
                <thead className="bg-bg-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Auction Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Starting Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Current Bid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Total Bids</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-bg-secondary divide-y divide-border-muted">
                  {auctions.map((auction) => (
                    <tr 
                      key={auction.id} 
                      className="hover:bg-bg-elevated cursor-pointer transition-colors"
                      onDoubleClick={() => {
                        if (auction.auction_status === 'awarded') {
                          setSelectedAuctionForDetails(auction);
                          setIsAuctionDetailsModalOpen(true);
                        } else if (auction.auction_status === 'active') {
                          setSelectedAuction(auction);
                          setIsBidModalOpen(true);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{auction.auction_type} Auction</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(auction.starting_price)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(auction.current_highest_bid || 0)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{auction.total_bids || 0}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{new Date(auction.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={
                          auction.auction_status === 'scheduled' ? 'warning' :
                          auction.auction_status === 'active' ? 'accent' :
                          auction.auction_status === 'closed' ? 'success' :
                          'danger'
                        }>
                          {auction.auction_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm space-x-2">
                        {auction.auction_status === 'scheduled' && (
                          <>
                            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleStartAuction(auction.id); }}>Start Auction</Button>
                            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleCancelAuction(auction.id); }}>Cancel</Button>
                          </>
                        )}
                        {auction.auction_status === 'active' && (
                          <>
                            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setSelectedAuction(auction); setIsBidModalOpen(true); }}>Place Bid</Button>
                            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleCloseAuction(auction.id); }}>Close</Button>
                          </>
                        )}
                        {auction.auction_status === 'closed' && (
                          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleAwardAuction(auction.id); }}>Award to Winner</Button>
                        )}
                        {auction.auction_status === 'awarded' && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-text-secondary">
                              Winner: <span className="font-semibold text-text-primary">
                                {bids.find(b => b.id === auction.winner_id)?.bidder_name || 'Unknown'}
                              </span>
                            </span>
                            <Badge variant="success">Completed</Badge>
                          </div>
                        )}
                        {auction.auction_status === 'cancelled' && (
                          <Badge variant="danger">Cancelled</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="New Disposal Request">
        <DisposalRequestForm onSubmit={handleSaveDisposalRequest} onClose={() => setIsRequestModalOpen(false)} />
      </Modal>

      <Modal isOpen={isEditRequestModalOpen} onClose={() => { setIsEditRequestModalOpen(false); setEditingRequest(undefined); }} title="Edit Disposal Request">
        <DisposalRequestForm initialData={editingRequest} onSubmit={handleSaveDisposalRequest} onClose={() => { setIsEditRequestModalOpen(false); setEditingRequest(undefined); }} />
      </Modal>

      {selectedRequest && (
        <Modal isOpen={isAuctionModalOpen} onClose={() => { setIsAuctionModalOpen(false); setSelectedRequest(undefined); }} title="Create Auction">
          <AuctionSetupForm request={selectedRequest} onSubmit={handleCreateAuction} onClose={() => { setIsAuctionModalOpen(false); setSelectedRequest(undefined); }} />
        </Modal>
      )}

      {selectedAuction && (
        <Modal isOpen={isBidModalOpen} onClose={() => { setIsBidModalOpen(false); setSelectedAuction(undefined); }} title="Place Bid">
          <BidSubmissionForm auction={selectedAuction} onSubmit={handleSubmitBid} onClose={() => { setIsBidModalOpen(false); setSelectedAuction(undefined); }} />
        </Modal>
      )}

      {selectedAuctionForDetails && (
        <Modal 
          isOpen={isAuctionDetailsModalOpen} 
          onClose={() => { setIsAuctionDetailsModalOpen(false); setSelectedAuctionForDetails(undefined); }} 
          title="Auction Details"
          size="large"
        >
          <AuctionDetailsView auction={selectedAuctionForDetails} />
        </Modal>
      )}
        </>
      )}
    </div>
  );
}
