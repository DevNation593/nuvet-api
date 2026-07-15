import 'reflect-metadata';
import { HttpStatus } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { PassportPublicPet } from '../../application/dto/passport.dto';
import { PassportController } from './passport.controller';

describe('PassportController Swagger metadata', () => {
    it('declares PassportPublicPet for getPetPassport success responses', () => {
        const responses = Reflect.getMetadata(
            DECORATORS.API_RESPONSE,
            PassportController.prototype.getPetPassport,
        );

        expect(responses[HttpStatus.OK].type).toBe(PassportPublicPet);
    });
});
