// AI-Driven Analysis Service using GitHub AI Models
// Compatible with GitHub Copilot subscription
import { FuelTransaction, Vehicle, Driver } from '../types';

interface FuelEfficiencyAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  costTrends: string;
  vehicleEfficiency: string[];
  efficiencyScore: number;
  anomalies: string[];
}

class OpenAIService {
  private apiKey: string;
  // GitHub AI Models endpoint (compatible with Copilot subscription)
  private apiUrl = 'https://models.inference.ai.azure.com/chat/completions';
  // Using GPT-4o model through GitHub AI Models
  private model = 'gpt-4o';

  constructor() {
    // Get GitHub token from environment variable or localStorage
    this.apiKey = import.meta.env.VITE_GITHUB_TOKEN || localStorage.getItem('github_token') || '';
  }

  /**
   * Set the GitHub token for AI Models
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('github_token', apiKey);
  }

  /**
   * Check if GitHub token is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Analyze fuel efficiency using GPT-4o through GitHub AI Models
   */
  async analyzeFuelEfficiency(
    transactions: FuelTransaction[],
    vehicles: Vehicle[],
    drivers: Driver[]
  ): Promise<FuelEfficiencyAnalysis> {
    if (!this.isConfigured()) {
      throw new Error('GitHub token is not configured. Please set your GitHub token first.');
    }

    // Prepare data summary for AI analysis
    const dataSummary = this.prepareFuelDataSummary(transactions, vehicles, drivers);

    const prompt = `You are a fleet management AI analyst. Analyze the following comprehensive fuel transaction data with historical odometer readings and provide detailed insights:

${dataSummary}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "Brief overview of fleet fuel usage patterns and operational status (2-3 sentences)",
  "insights": ["Key insight 1 about efficiency trends", "Key insight 2 about cost patterns", "Key insight 3 about vehicle performance", "Key insight 4 about operational issues"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3", "Actionable recommendation 4"],
  "costTrends": "Detailed analysis of cost trends, patterns, and potential savings opportunities",
  "vehicleEfficiency": ["Vehicle 1 analysis with L/km and km/L metrics", "Vehicle 2 analysis", "Identify best and worst performers", "Note any vehicles with declining efficiency", "Highlight vehicles with anomalies"],
  "efficiencyScore": 75,
  "anomalies": ["Odometer rollbacks or inconsistencies", "Unusual fuel consumption patterns", "High-distance single trips", "Low fuel economy incidents", "Any other operational concerns"]
}

Focus on:
1. **Cost Efficiency & Trends**: Analyze cost per liter trends, identify cost-saving opportunities
2. **Fuel Consumption Patterns**: Compare vehicle efficiency (L/km), identify best/worst performers
3. **Distance Analysis**: Evaluate distance traveled per transaction, operational patterns
4. **Historical Performance**: Track efficiency trends over time, identify declining performance
5. **Anomaly Detection**: Flag odometer issues, unusual consumption, suspicious patterns
6. **Driver Behavior**: If applicable, analyze driver-specific fuel usage patterns
7. **Maintenance Indicators**: Identify vehicles that may need maintenance based on declining efficiency
8. **Operational Insights**: Provide actionable recommendations for fleet optimization

Provide data-driven, actionable recommendations based on the comprehensive analysis.`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert fleet management analyst specializing in fuel efficiency optimization. Provide clear, actionable insights based on data analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to analyze fuel efficiency');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const analysis: FuelEfficiencyAnalysis = JSON.parse(content);

      return analysis;
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI Analysis failed: ${error.message}`);
    }
  }

  /**
   * Prepare fuel data summary for AI analysis
   */
  private prepareFuelDataSummary(
    transactions: FuelTransaction[],
    vehicles: Vehicle[],
    drivers: Driver[]
  ): string {
    const totalTransactions = transactions.length;
    const totalLiters = transactions.reduce((sum, t) => sum + t.liters, 0);
    const totalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
    const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    // Calculate comprehensive per-vehicle statistics with historical analysis
    const vehicleStats = vehicles.map(vehicle => {
      const vehicleTxns = transactions
        .filter(t => t.vehicle_id === vehicle.id)
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
      
      const totalLiters = vehicleTxns.reduce((sum, t) => sum + t.liters, 0);
      const totalCost = vehicleTxns.reduce((sum, t) => sum + t.cost, 0);
      
      // Calculate distance traveled per transaction and overall statistics
      let totalDistance = 0;
      let validTransactions = 0;
      const transactionDetails: string[] = [];
      const efficiencies: number[] = [];
      const anomalies: string[] = [];
      
      for (let i = 1; i < vehicleTxns.length; i++) {
        const prevOdometer = vehicleTxns[i - 1].odometer_reading || 0;
        const currOdometer = vehicleTxns[i].odometer_reading || 0;
        const distanceTraveled = currOdometer - prevOdometer;
        
        if (distanceTraveled > 0) {
          totalDistance += distanceTraveled;
          validTransactions++;
          
          const liters = vehicleTxns[i].liters;
          const efficiency = liters / distanceTraveled;
          const kmPerL = distanceTraveled / liters;
          efficiencies.push(efficiency);
          
          transactionDetails.push(
            `${new Date(vehicleTxns[i].transaction_date).toLocaleDateString()}: ${distanceTraveled.toFixed(0)}km, ${liters.toFixed(2)}L, ${efficiency.toFixed(3)} L/km, ${kmPerL.toFixed(2)} km/L`
          );
          
          // Detect anomalies
          if (distanceTraveled > 1000) {
            anomalies.push(`High distance: ${distanceTraveled.toFixed(0)}km on ${new Date(vehicleTxns[i].transaction_date).toLocaleDateString()}`);
          }
          if (efficiency > 0.2) {
            anomalies.push(`High fuel consumption: ${efficiency.toFixed(3)} L/km on ${new Date(vehicleTxns[i].transaction_date).toLocaleDateString()}`);
          }
          if (kmPerL < 5) {
            anomalies.push(`Low fuel economy: ${kmPerL.toFixed(2)} km/L on ${new Date(vehicleTxns[i].transaction_date).toLocaleDateString()}`);
          }
        } else if (distanceTraveled < 0) {
          anomalies.push(`Odometer rollback detected on ${new Date(vehicleTxns[i].transaction_date).toLocaleDateString()}`);
        }
      }
      
      // Calculate average and best/worst efficiency
      const avgEfficiency = efficiencies.length > 0 
        ? (efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length).toFixed(3) + ' L/km'
        : 'N/A';
      const avgKmPerLiter = efficiencies.length > 0
        ? (efficiencies.reduce((sum, e) => sum + (1 / e), 0) / efficiencies.length).toFixed(2) + ' km/L'
        : 'N/A';
      const bestEfficiency = efficiencies.length > 0
        ? Math.min(...efficiencies).toFixed(3) + ' L/km'
        : 'N/A';
      const worstEfficiency = efficiencies.length > 0
        ? Math.max(...efficiencies).toFixed(3) + ' L/km'
        : 'N/A';
      
      return {
        vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.plate_number})`,
        transactions: vehicleTxns.length,
        validTransactions: validTransactions,
        liters: totalLiters.toFixed(2),
        cost: totalCost.toFixed(2),
        avgCostPerLiter: totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '0',
        distance: totalDistance.toFixed(2),
        avgDistancePerTransaction: validTransactions > 0 ? (totalDistance / validTransactions).toFixed(2) : '0',
        avgEfficiency: avgEfficiency,
        avgKmPerLiter: avgKmPerLiter,
        bestEfficiency: bestEfficiency,
        worstEfficiency: worstEfficiency,
        transactionDetails: transactionDetails.slice(-5), // Last 5 transactions
        anomalies: anomalies
      };
    }).filter(v => v.transactions > 0);

    // Calculate per-driver statistics (if available)
    const driverStats = drivers.map(driver => {
      const driverTxns = transactions.filter(t => t.driver_id === driver.id);
      const liters = driverTxns.reduce((sum, t) => sum + t.liters, 0);
      const cost = driverTxns.reduce((sum, t) => sum + t.cost, 0);
      return {
        driver: driver.full_name,
        transactions: driverTxns.length,
        liters: liters.toFixed(2),
        cost: cost.toFixed(2)
      };
    }).filter(d => d.transactions > 0);

    // Recent transactions (last 10)
    const recentTransactions = transactions
      .slice(0, 10)
      .map(t => {
        const vehicle = vehicles.find(v => v.id === t.vehicle_id);
        const driver = drivers.find(d => d.id === t.driver_id);
        return {
          date: new Date(t.transaction_date).toLocaleDateString(),
          vehicle: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          driver: driver?.full_name || 'Unknown',
          liters: t.liters.toFixed(2),
          cost: t.cost.toFixed(2),
          costPerLiter: t.cost_per_liter.toFixed(2)
        };
      });

    return `
FLEET FUEL CONSUMPTION OVERVIEW:
- Total Transactions: ${totalTransactions}
- Total Fuel Consumed: ${totalLiters.toFixed(2)} liters
- Total Cost: Php ${totalCost.toFixed(2)}
- Average Cost per Liter: Php ${avgCostPerLiter.toFixed(2)}
- Total Vehicles: ${vehicles.length}
- Active Drivers: ${drivers.filter(d => d.status === 'active').length}

VEHICLE-SPECIFIC COMPREHENSIVE ANALYSIS:
${vehicleStats.map(v => `
═══════════════════════════════════════════════════════════════
VEHICLE: ${v.vehicle}
───────────────────────────────────────────────────────────────
TRANSACTION SUMMARY:
  * Total Transactions: ${v.transactions}
  * Valid Distance Calculations: ${v.validTransactions}
  * Total Fuel Consumed: ${v.liters}L
  * Total Cost: Php ${v.cost}
  * Avg Cost per Liter: Php ${v.avgCostPerLiter}
  
DISTANCE & EFFICIENCY METRICS:
  * Total Distance Traveled: ${v.distance} km
  * Avg Distance per Transaction: ${v.avgDistancePerTransaction} km
  * Average Fuel Consumption: ${v.avgEfficiency}
  * Average Fuel Economy: ${v.avgKmPerLiter}
  * Best Performance: ${v.bestEfficiency}
  * Worst Performance: ${v.worstEfficiency}
  
RECENT TRANSACTION HISTORY (Last 5):
${v.transactionDetails.length > 0 ? v.transactionDetails.map(td => `  - ${td}`).join('\n') : '  No valid transaction history'}

DETECTED ANOMALIES:
${v.anomalies.length > 0 ? v.anomalies.map(a => `  ⚠ ${a}`).join('\n') : '  ✓ No anomalies detected'}
`).join('\n')}

DRIVER-SPECIFIC STATISTICS:
${driverStats.length > 0 ? driverStats.map(d => `- ${d.driver}: ${d.transactions} transactions, ${d.liters}L, Php ${d.cost}`).join('\n') : 'No driver data available'}

RECENT TRANSACTIONS (Last 10):
${recentTransactions.map((t, i) => `${i + 1}. ${t.date} - ${t.vehicle} (${t.driver}): ${t.liters}L @ Php ${t.costPerLiter}/L = Php ${t.cost}`).join('\n')}
`;
  }
}

export const openaiService = new OpenAIService();
