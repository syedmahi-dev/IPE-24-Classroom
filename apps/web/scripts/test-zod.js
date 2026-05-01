const { z } = require('zod');

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  courseId: z.string().optional(),
  category: z.enum(['lecture_notes', 'assignment', 'past_paper', 'syllabus', 'other']).optional(),
  search: z.string().optional(),
});

const parsed = querySchema.safeParse({ page: '1', limit: '15' });
console.log(JSON.stringify(parsed, null, 2));
