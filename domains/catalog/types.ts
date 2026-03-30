export interface Category {
  id: string;
  storeId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  optionGroups?: OptionGroup[];
}

export interface OptionGroup {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  options: MenuOption[];
}

export interface MenuOption {
  id: string;
  optionGroupId: string;
  name: string;
  additionalPrice: number;
}
