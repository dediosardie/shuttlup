import { useState } from 'react';
import { Vehicle } from '../types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select } from './ui';
import Modal from './Modal';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onDispose: (vehicleId: string, disposalReason: string, currentMileage: number) => void;
  onEdit: (vehicle: Vehicle) => void;
}

export default function VehicleTable({ vehicles, onDispose, onEdit }: VehicleTableProps) {
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [disposalReason, setDisposalReason] = useState<string>('end_of_life');
  const [currentMileage, setCurrentMileage] = useState<number>(0);

  const handleDispose = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDisposalReason('end_of_life');
    setCurrentMileage(0);
    setIsDisposalModalOpen(true);
  };

  const handleSubmitDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVehicle) {
      onDispose(selectedVehicle.id, disposalReason, currentMileage);
      setIsDisposalModalOpen(false);
      setSelectedVehicle(null);
    }
  };

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
          <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-1">No vehicles found</h3>
        <p className="text-text-secondary">Get started by adding your first vehicle to the fleet</p>
      </div>
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plate Number</TableHead>
          <TableHead>Conduction #</TableHead>
          <TableHead>Make</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Variant</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>VIN</TableHead>
          <TableHead>Fuel Capacity</TableHead>
          <TableHead>Ownership Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Insurance Expiry</TableHead>
          <TableHead>Registration Expiry</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => (
          <TableRow
            key={vehicle.id}
            className="cursor-pointer"
            onDoubleClick={() => onEdit(vehicle)}
            title="Double-click to edit"
          >
            <TableCell className="font-medium">
              {vehicle.plate_number}
            </TableCell>
            <TableCell className="font-mono">
              {vehicle.conduction_number || '-'}
            </TableCell>
            <TableCell>
              {vehicle.make}
            </TableCell>
            <TableCell>
              {vehicle.model}
            </TableCell>
            <TableCell>
              {vehicle.variant || '-'}
            </TableCell>
            <TableCell>
              {vehicle.year}
            </TableCell>
            <TableCell className="font-mono">
              {vehicle.vin}
            </TableCell>
            <TableCell>
              {vehicle.fuel_capacity ? `${vehicle.fuel_capacity} L` : '-'}
            </TableCell>
            <TableCell className="capitalize">
              {vehicle.ownership_type}
            </TableCell>
            <TableCell>
              <Badge variant={
                vehicle.status === 'disposed' ? 'warning' :
                vehicle.status === 'active' ? 'success' :
                vehicle.status === 'maintenance' ? 'warning' :
                'default'
              }>
                {vehicle.status}
              </Badge>
            </TableCell>
            <TableCell>
              {vehicle.insurance_expiry}
            </TableCell>
            <TableCell>
              {vehicle.registration_expiry}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button
                onClick={() => onEdit(vehicle)}
                variant="ghost"
                size="sm"
              >
                Edit
              </Button>
              <Button
                onClick={() => handleDispose(vehicle)}
                variant="ghost"
                size="sm"
              >
                Dispose
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* Disposal Request Modal */}
    <Modal 
      isOpen={isDisposalModalOpen} 
      onClose={() => {
        setIsDisposalModalOpen(false);
        setSelectedVehicle(null);
      }} 
      title="Create Disposal Request"
    >
      <form onSubmit={handleSubmitDisposal} className="space-y-4">
        <div className="bg-accent-soft border border-border-muted rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-text-primary mb-2">Vehicle Information</h4>
          {selectedVehicle && (
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Plate Number:</span> {selectedVehicle.plate_number}
              </p>
              {selectedVehicle.conduction_number && (
                <p className="text-sm text-text-secondary">
                  <span className="font-medium">Conduction Number:</span> {selectedVehicle.conduction_number}
                </p>
              )}
              <p className="text-sm text-text-secondary">
                <span className="font-medium">Vehicle:</span> {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
              <p className="text-sm text-text-secondary">
                <span className="font-medium">VIN:</span> {selectedVehicle.vin}
              </p>
            </div>
          )}
        </div>

        <div>
          <Select
            label={<>Reason for Disposal <span className="text-red-600">*</span></>}
            value={disposalReason}
            onChange={(e) => setDisposalReason(e.target.value)}
            required
          >
            <option value="end_of_life">End of Life</option>
            <option value="excessive_maintenance">Excessive Maintenance</option>
            <option value="accident_damage">Accident Damage</option>
            <option value="upgrade">Upgrade</option>
            <option value="policy_change">Policy Change</option>
          </Select>
        </div>

        <div>
          <Input
            label={<>Current Mileage (km) <span className="text-red-600">*</span></>}
            type="number"
            value={currentMileage}
            onChange={(e) => setCurrentMileage(parseInt(e.target.value))}
            required
            min="0"
            step="1"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => {
              setIsDisposalModalOpen(false);
              setSelectedVehicle(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Submit Disposal Request
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
}
