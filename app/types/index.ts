export type Brand =
  | "Tata"
  | "Mahindra"
  | "Force Motors"
  | "Toyota"
  | "Honda"
  | "Maruti Suzuki"
  | "Nissan"
  | "Lexus"
  | "Hyundai"
  | "Kia"
  | "BMW"
  | "Mercedes-Benz"
  | "Audi"
  | "Volkswagen"
  | "Škoda"
  | "Porsche"
  | "Ford"
  | "Jeep"
  | "Land Rover"
  | "Jaguar"
  | "Mini"
  | "Bentley"
  | "Rolls-Royce"
  | "MG (Morris Garages)"
  | "Fiat"
  | "Ferrari"
  | "Lamborghini"
  | "Maserati"
  | "Renault"
  | "Citroën"
  | "Peugeot"
  | "BYD"
  | "Tesla"
  | "Volvo"
  | "Ola Electric";

export type CarType =
  | "Sedan"
  | "SUV"
  | "Hatchback"
  | "Convertible"
  | "Coupe"
  | "Minivan"
  | "Pickup"
  | "Crossover";

export type Transmission = "Automatic" | "Manual";

export type FuelType = "Petrol" | "Diesel" | "Electric" | "Hybrid" | "CNG";

export type CarStatus = "available" | "rented" | "booked" | "maintenance";

export interface Car {
  id: string;
  name: string;
  brand: Brand;
  type: CarType;
  transmission: Transmission;
  fuelType: FuelType;
  registrationNo: string;
  seats: number;
  basePricePerHour: number;
  depositAmount: number;
  status: CarStatus;
  city: string;
  coverImage: string;
  galleryImages: string[];
}
