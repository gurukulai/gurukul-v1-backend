// src/experts/experts.service.ts
import { Injectable } from '@nestjs/common';
import { Expert, CreateExpertDto } from './dto/experts.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExpertsService {
  private experts: Map<string, Expert> = new Map();

  createExpert(createExpertDto: CreateExpertDto): Expert {
    const expert: Expert = {
      id: uuidv4(),
      ...createExpertDto,
      namespace: `expert-${uuidv4()}`, // Unique namespace for Pinecone
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.experts.set(expert.id, expert);
    return expert;
  }

  getExpert(id: string): Expert | undefined {
    return this.experts.get(id);
  }

  getAllExperts(): Expert[] {
    return Array.from(this.experts.values());
  }
}
