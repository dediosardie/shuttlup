// Route Type Definition
export interface Route {
  id: string;
  lines: number;
  route: string;
  part_number: string;
  rate: number;
  po_qty: number;
  created_at?: string;
  updated_at?: string;
}
