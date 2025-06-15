/**
 * Account Destination Service
 * Manages account destinations for fund movements
 */

export interface AccountDestination {
  id: string;
  name: string;
  displayName: string;
  type: 'TFSA' | 'RRSP' | 'CASH' | 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'OTHER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountDestinationData {
  name: string;
  displayName: string;
  type: AccountDestination['type'];
}

export interface UpdateAccountDestinationData {
  name?: string;
  displayName?: string;
  type?: AccountDestination['type'];
  isActive?: boolean;
}

const STORAGE_KEY = 'account_destinations';

// Default account destinations
const DEFAULT_DESTINATIONS: Omit<AccountDestination, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'TFSA', displayName: 'TFSA', type: 'TFSA', isActive: true },
  { name: 'RRSP', displayName: 'RRSP', type: 'RRSP', isActive: true },
  { name: 'RBC Signature No Limit Banking - Chequing 511', displayName: 'RBC Chequing 511', type: 'CHECKING', isActive: true },
  { name: 'RBC Signature No Limit Banking - Savings', displayName: 'RBC Savings', type: 'SAVINGS', isActive: true },
  { name: 'Cash Account', displayName: 'Cash Account', type: 'CASH', isActive: true }
];

class AccountDestinationService {
  private static instance: AccountDestinationService;

  public static getInstance(): AccountDestinationService {
    if (!AccountDestinationService.instance) {
      AccountDestinationService.instance = new AccountDestinationService();
    }
    return AccountDestinationService.instance;
  }

  /**
   * Initialize with default destinations if none exist
   */
  public async initialize(): Promise<void> {
    const existing = this.getAll();
    if (existing.length === 0) {
      // Initialize with default destinations
      for (const destination of DEFAULT_DESTINATIONS) {
        await this.create(destination);
      }
    }
  }

  /**
   * Get all account destinations
   */
  public getAll(): AccountDestination[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const destinations = JSON.parse(stored) as AccountDestination[];
        return destinations.map(dest => ({
          ...dest,
          createdAt: new Date(dest.createdAt),
          updatedAt: new Date(dest.updatedAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get account destinations:', error);
      return [];
    }
  }

  /**
   * Get active account destinations only
   */
  public getActive(): AccountDestination[] {
    return this.getAll().filter(dest => dest.isActive);
  }

  /**
   * Get account destination by ID
   */
  public getById(id: string): AccountDestination | null {
    const destinations = this.getAll();
    return destinations.find(dest => dest.id === id) || null;
  }

  /**
   * Create a new account destination
   */
  public async create(data: CreateAccountDestinationData): Promise<AccountDestination> {
    const destinations = this.getAll();
    
    // Check for duplicate names
    const existingNames = destinations.map(d => d.name.toLowerCase());
    if (existingNames.includes(data.name.toLowerCase())) {
      throw new Error('An account destination with this name already exists');
    }

    const newDestination: AccountDestination = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      displayName: data.displayName.trim(),
      type: data.type,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    destinations.push(newDestination);
    this.saveAll(destinations);

    return newDestination;
  }

  /**
   * Update an account destination
   */
  public async update(id: string, data: UpdateAccountDestinationData): Promise<AccountDestination> {
    const destinations = this.getAll();
    const index = destinations.findIndex(dest => dest.id === id);
    
    if (index === -1) {
      throw new Error('Account destination not found');
    }

    // Check for duplicate names if name is being updated
    if (data.name) {
      const existingNames = destinations
        .filter(d => d.id !== id)
        .map(d => d.name.toLowerCase());
      if (existingNames.includes(data.name.toLowerCase())) {
        throw new Error('An account destination with this name already exists');
      }
    }

    const updatedDestination: AccountDestination = {
      ...destinations[index],
      ...data,
      name: data.name?.trim() || destinations[index].name,
      displayName: data.displayName?.trim() || destinations[index].displayName,
      updatedAt: new Date()
    };

    destinations[index] = updatedDestination;
    this.saveAll(destinations);

    return updatedDestination;
  }

  /**
   * Delete an account destination
   */
  public async delete(id: string): Promise<boolean> {
    const destinations = this.getAll();
    const filteredDestinations = destinations.filter(dest => dest.id !== id);
    
    if (filteredDestinations.length === destinations.length) {
      return false; // No destination found
    }

    this.saveAll(filteredDestinations);
    return true;
  }

  /**
   * Get account options for form dropdowns
   */
  public getAccountOptions(): { value: string; label: string }[] {
    return this.getActive().map(dest => ({
      value: dest.name,
      label: dest.displayName
    }));
  }

  /**
   * Get account type options
   */
  public getAccountTypeOptions(): { value: AccountDestination['type']; label: string }[] {
    return [
      { value: 'TFSA', label: 'TFSA (Tax-Free Savings Account)' },
      { value: 'RRSP', label: 'RRSP (Registered Retirement Savings Plan)' },
      { value: 'CASH', label: 'Cash Account' },
      { value: 'CHECKING', label: 'Checking Account' },
      { value: 'SAVINGS', label: 'Savings Account' },
      { value: 'INVESTMENT', label: 'Investment Account' },
      { value: 'OTHER', label: 'Other' }
    ];
  }

  /**
   * Save all destinations to localStorage
   */
  private saveAll(destinations: AccountDestination[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(destinations));
    } catch (error) {
      console.error('Failed to save account destinations:', error);
      throw new Error('Failed to save account destinations');
    }
  }

  /**
   * Reset to default destinations
   */
  public async resetToDefaults(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    await this.initialize();
  }

  /**
   * Export destinations as JSON
   */
  public exportData(): string {
    const destinations = this.getAll();
    return JSON.stringify(destinations, null, 2);
  }

  /**
   * Import destinations from JSON
   */
  public async importData(jsonData: string): Promise<void> {
    try {
      const importedDestinations = JSON.parse(jsonData) as AccountDestination[];
      
      // Validate the structure
      for (const dest of importedDestinations) {
        if (!dest.id || !dest.name || !dest.displayName || !dest.type) {
          throw new Error('Invalid account destination data structure');
        }
      }

      // Merge with existing destinations (avoid duplicates)
      const existing = this.getAll();
      const existingNames = existing.map(d => d.name.toLowerCase());
      
      for (const dest of importedDestinations) {
        if (!existingNames.includes(dest.name.toLowerCase())) {
          await this.create({
            name: dest.name,
            displayName: dest.displayName,
            type: dest.type
          });
        }
      }
    } catch (error) {
      console.error('Failed to import account destinations:', error);
      throw new Error('Failed to import account destinations: Invalid data format');
    }
  }
}

export const accountDestinationService = AccountDestinationService.getInstance();
export default accountDestinationService;
