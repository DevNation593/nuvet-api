import { validate } from 'class-validator';
import { PassportLookupQueryDto } from './passport.dto';

describe('PassportLookupQueryDto', () => {
    it('rejects an empty microchip', async () => {
        const dto = Object.assign(new PassportLookupQueryDto(), { microchip: '' });

        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });
});
