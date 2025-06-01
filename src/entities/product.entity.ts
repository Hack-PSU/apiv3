import {
  IsString,
  IsOptional,
  IsInt, // Added IsInt
  Min,
  IsDate,
  // IsNumber, // Alternative to IsInt if decimal numbers were allowed for an ID, but IsInt is better for INTEGER FKs
} from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Entity } from './base.entity';
import { Column, ID, Table } from 'common/objection';

// Direct imports for related entities
import { User } from './user.entity';
import { Location } from './location.entity';
// String path for InventoryHistory due to potential circular dependency
// import { InventoryHistory } from './inventory-history.entity';

@Table({
  tableName: 'products',
  relationMappings: {
    user: {
      relation: Entity.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'products.userId',
        to: 'users.id',
      },
    },
    location: {
      relation: Entity.BelongsToOneRelation,
      modelClass: Location,
      join: {
        from: 'products.locationId',
        to: 'locations.id',
      },
    },
    histories: {
      relation: Entity.HasManyRelation,
      modelClass: './inventory-history.entity', // String path for modelClass
      join: {
        from: 'products.id',
        to: 'inventory_history.productId',
      },
    },
  },
})
export class Product extends Entity {
  @ApiProperty({ type: String, description: 'Product ID (CUID)' })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty({ type: String, description: 'Name of the product' })
  @IsString()
  @Column({ type: 'string' })
  name: string;

  @ApiProperty({ type: String, nullable: true, description: 'Description of the product' })
  @IsOptional()
  @IsString()
  @Column({ type: 'string', nullable: true })
  description?: string;

  @ApiProperty({ type: String, nullable: true, description: 'URL of the product photo' })
  @IsOptional()
  @IsString()
  @Column({ type: 'string', nullable: true })
  photoUrl?: string;

  @ApiProperty({ type: String, nullable: true, description: 'Category of the product' })
  @IsOptional()
  @IsString()
  @Column({ type: 'string', nullable: true })
  category?: string;

  @ApiProperty({ type: String, nullable: true, description: 'Additional notes for the product' })
  @IsOptional()
  @IsString()
  @Column({ type: 'string', nullable: true })
  notes?: string;

  @ApiProperty({ type: Number, default: 0, description: 'Quantity of the product in stock' })
  @IsInt()
  @Min(0)
  @Column({ type: 'integer' })
  quantity: number;

  // userId remains string, references users.id (TEXT)
  @ApiProperty({ type: String, nullable: true, description: 'User ID associated with the product' })
  @IsOptional()
  @IsString()
  @Column({ type: 'string', nullable: true }) // Explicit type or let Objection infer
  userId?: string;

  // locationId changed to number, references locations.id (INTEGER)
  @ApiProperty({ type: Number, nullable: true, description: 'Location ID of the product' })
  @IsOptional()
  @IsInt() // Changed from IsString
  @Column({ type: 'integer', nullable: true }) // Explicit type or let Objection infer
  locationId?: number; // Changed from string

  @ApiProperty({ type: Date, description: 'Timestamp of product creation' })
  @IsDate()
  @Column({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date, description: 'Timestamp of last product update' })
  @IsDate()
  @Column({ type: 'timestamp' })
  updatedAt: Date;

  user?: User;
  location?: Location;
  histories?: import('./inventory-history.entity').InventoryHistory[];
}

const productFields = [
  'id',
  'name',
  'description',
  'photoUrl',
  'category',
  'notes',
  'quantity',
  'userId',
  'locationId',
  'createdAt',
  'updatedAt',
] as const;

export class ProductEntity extends PickType(Product, productFields) {}
