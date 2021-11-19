import { BuilderClient } from '@nitric/boxygen-api/builder/v1/builder_grpc_pb';
import execa from 'execa';
import { BOXYGEN_IMAGE, Workspace } from './workspace';
import tcpPortUsed from 'tcp-port-used';


jest.mock('get-port', () => ({
  __esModule: true, // this property makes it work
  default: jest.fn().mockReturnValue(1),
}));


describe('workspace', () => {
	describe('when starting a new workspace', () => {
		let commandSpy: jest.SpyInstance;
		let commandSyncSpy: jest.SpyInstance;
		let waitUntilUsedSpy: jest.SpyInstance;
		
		const program = jest.fn();
		const mockDockerCmd = {
			kill: jest.fn(),
		};

		// setup mocks
		beforeAll(() => {
			waitUntilUsedSpy = jest.spyOn(tcpPortUsed, 'waitUntilUsed').mockImplementation(async () => {});
			commandSpy = jest.spyOn(execa, 'command').mockImplementation(() => mockDockerCmd as any);
			commandSyncSpy = jest.spyOn(execa, 'commandSync').mockImplementation(() => ({} as any));
		});
		
		beforeEach(async () => {
			commandSpy.mockClear();
			commandSyncSpy.mockClear();
			waitUntilUsedSpy.mockClear();
			program.mockClear();

			await Workspace.start(program);
		});

		afterAll(() => {
			commandSpy.mockReset();
			commandSyncSpy.mockReset();
			waitUntilUsedSpy.mockReset();
		});

		it('should pull the boxygen server docker image', () => {
			expect(commandSyncSpy).toBeCalledTimes(1);
			expect(commandSyncSpy).toBeCalledWith(`docker pull ${BOXYGEN_IMAGE}`);
		});

		it('should start the boxygen server', () => {
			expect(commandSpy).toBeCalled();
		});

		it('should wait for the server to start', () =>{
			expect(waitUntilUsedSpy).toBeCalledTimes(1);
			expect(waitUntilUsedSpy).toBeCalledWith(1, 100, 5000);
		})

		it('should run the provided boxygen program', () => {
			expect(program).toBeCalledTimes(1);
		});

		it('should stop the boxygen server', () => {
			expect(mockDockerCmd.kill).toBeCalled();
		});
	});
});