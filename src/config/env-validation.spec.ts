describe('env-validation', () => {
    const originalEnv = process.env;
    let exitSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        exitSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('should not exit when DATABASE_URL is provided', () => {
        process.env.DATABASE_URL = 'postgresql://test';
        const { validateEnvironment } = require('./env-validation');
        validateEnvironment();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit when DATABASE_URL is missing', () => {
        delete process.env.DATABASE_URL;
        const { validateEnvironment } = require('./env-validation');
        validateEnvironment();
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit in production when JWT secrets are missing', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://test';
        delete process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_REFRESH_SECRET;
        const { validateEnvironment } = require('./env-validation');
        validateEnvironment();
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should warn about default dev values in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://test';
        process.env.JWT_ACCESS_SECRET = 'change-me-in-production';
        process.env.JWT_REFRESH_SECRET = 'valid-secret';
        process.env.CORS_ORIGINS = 'https://app.nuvet.com';

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const { validateEnvironment } = require('./env-validation');
        validateEnvironment();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
