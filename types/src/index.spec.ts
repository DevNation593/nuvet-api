import { getRolePermissions, PermissionAction, PermissionModule, UserRole } from './index';

const permission = (action: PermissionAction) =>
    `${PermissionModule.PASSPORT}:${action}` as const;

describe('passport role permissions', () => {
    it('permite lectura a veterinarios y recepcionistas', () => {
        expect(getRolePermissions(UserRole.VET)).toContain(permission(PermissionAction.READ));
        expect(getRolePermissions(UserRole.RECEPTIONIST)).toContain(permission(PermissionAction.READ));
    });

    it('permite las acciones de share al cliente propietario y al staff que las expone', () => {
        expect(getRolePermissions(UserRole.CLIENT)).toEqual(
            expect.arrayContaining([
                permission(PermissionAction.READ),
                permission(PermissionAction.CREATE),
                permission(PermissionAction.DELETE),
            ]),
        );
        expect(getRolePermissions(UserRole.CLINIC_ADMIN)).toEqual(
            expect.arrayContaining([
                permission(PermissionAction.READ),
                permission(PermissionAction.CREATE),
                permission(PermissionAction.DELETE),
            ]),
        );
    });
});
