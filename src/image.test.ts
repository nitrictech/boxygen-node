import { Image } from "./image";
import { BuilderClient } from "@nitric/boxygen-api/builder/v1/builder_grpc_pb";
import { ConfigRequest, AddRequest, CopyRequest, CommitRequest, FromResponse, RunRequest, Container } from "@nitric/boxygen-api/builder/v1/builder_pb";
import * as grpc from '@grpc/grpc-js';
import Readable from 'stream';

const newMockContainer = (id: string) => {
	const c = new Container();
	return c
}

describe("Image", () => {
	let fromSpy: jest.SpyInstance;

  beforeAll(() => {
		jest.spyOn(Image.prototype, 'client', 'get').mockReturnValue(new BuilderClient(`127.0.0.1:50051`, grpc.ChannelCredentials.createInsecure()));
		jest.spyOn(Image.prototype, 'context', 'get').mockReturnValue('.');

		fromSpy = jest.spyOn(BuilderClient.prototype, 'from').mockImplementation((_, callback: any) => {
			const resp = new FromResponse();
			resp.setContainer(newMockContainer("test"));

			callback(resp);

			return null as any;
		});
	});
  //describe("from", () => {
	//	let image: Image;
	//	beforeEach(() => {
	//		image = Image["from"](mockWorkspace, 'test');
	//	});

	//	it('should return an image Id from the boxygen server', () => {
	//		expect(image.id).toBe("test");
	//	});
  //});

  describe("add", () => {
		const addStream = new Readable(); 
		let addSpy: jest.SpyInstance;
		let image: Image;

		beforeAll(() => {
			addSpy = jest.spyOn(BuilderClient.prototype, 'add').mockImplementation(() => {
				return addStream as any;
			});
		});

		beforeEach(async () => {
			addSpy.mockClear();
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);
			image.add('test.txt', 'test.txt');
			addStream.emit('end', null);
			image.stage();
		});

		afterAll(() => {
			addSpy.mockRestore();
		});

		it('should call BuilderClient.add', async () => {
			expect(addSpy).toBeCalledTimes(1);

			const expectedRequest = new AddRequest();

			expectedRequest.setContainer(await image['container']);
			expectedRequest.setSrc('test.txt');
			expectedRequest.setDest('test.txt');

			expect(addSpy).toBeCalledWith(expectedRequest);
		});
	});

  describe("copy", () => {
		const copyStream = new Readable(); 
		let copySpy: jest.SpyInstance;
		let image: Image;

		beforeAll(() => {
			copySpy = jest.spyOn(BuilderClient.prototype, 'copy').mockReturnValue(copyStream as any);
		});

		beforeEach(async () => {
			copySpy.mockClear();
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);
			image.copy('test.txt', 'test.txt');
			copyStream.emit('end', null);
			image.stage();
		});

		afterAll(() => {
			copySpy.mockRestore();
		});

		it('should call BuilderClient.copy', async () => {
			expect(copySpy).toBeCalledTimes(1);

			const expectedRequest = new CopyRequest();

			expectedRequest.setContainer(await image['container']);
			expectedRequest.setSource('test.txt');
			expectedRequest.setDest('test.txt');


			expect(copySpy).toBeCalledWith(expectedRequest);
		});
	});

  describe("run", () => {
		const runStream = new Readable(); 
		let runSpy: jest.SpyInstance;
		let image: Image;

		beforeAll(() => {
			runSpy = jest.spyOn(BuilderClient.prototype, 'run')
				.mockReturnValue(runStream as any);
		});

		beforeEach(async () => {
			runSpy.mockClear();
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);
			image.run(['echo', 'hello world!']);
			image.stage();
			runStream.emit('end', null);
		});

		afterAll(() => {
			runSpy.mockRestore();
		});

		it('should call BuilderClient.run', async () => {
			expect(runSpy).toBeCalledTimes(1);

			const expectedRequest = new RunRequest();

			expectedRequest.setContainer(await image['container']);
			expectedRequest.setCommandList(['echo', 'hello world!']);

			expect(runSpy).toBeCalledWith(expectedRequest);
		});
	});

  describe("config", () => {
		const configStream = new Readable(); 
		let configSpy: jest.SpyInstance;
		let image: Image;

		beforeAll(() => {
			configSpy = jest.spyOn(BuilderClient.prototype, 'config').mockReturnValue(configStream as any);
		});

		beforeEach(async () => {
			configSpy.mockClear();
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);
			image.config({
				cmd: ['echo', 'hello world!'],
				entrypoint: ['/bin/bash', '-c'],
				ports: [9001],
				volumes: ['/workspace/'],
				env: {
					TEST: 'test',
				}
			});
			image.stage();
			configStream.emit('end', null);
		});

		afterAll(() => {
			configSpy.mockRestore();
		});

		it('should call BuilderClient.config', async () => {
			expect(configSpy).toBeCalledTimes(1);

			const expectedRequest = new ConfigRequest();

			expectedRequest.setContainer(await image['container']);
			expectedRequest.setCmdList(['echo', 'hello world!']);
			expectedRequest.setEntrypointList(['/bin/bash', '-c']);
			expectedRequest.setPortsList([9001]);
			expectedRequest.setVolumesList(['/workspace/']);
			expectedRequest.getEnvMap().set('TEST', 'test');

			expect(configSpy).toBeCalledWith(expectedRequest);
		});
	});

  describe("apply", () => {
		let image: Image;
		const mockMiddleware = jest.fn();
		beforeEach(() => {
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);

			image.apply(mockMiddleware);
		});
		it('should queue the middleware for execution', () => {
			expect(image['instructions']).toContain(mockMiddleware);
		});
	});

  describe("stage", () => {
		let image: Image;
		const mockMiddleware = jest.fn();
		beforeEach(async () => {
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);

			image['instructions'] = [mockMiddleware];
			await image.stage();
		});
		it('should execute queued instructions', () => {
			expect(mockMiddleware).toBeCalledTimes(1);
		});
	});

  describe("commit", () => {
		let image: Image;
		let stageSpy: jest.SpyInstance;
		let commitSpy: jest.SpyInstance;
		const commitStream = new Readable();
		const mockMiddleware = jest.fn();

		beforeAll(() => {
			commitSpy = jest.spyOn(BuilderClient.prototype, 'commit').mockReturnValue(commitStream as any)
		});

		beforeEach(async () => {
			stageSpy = jest.spyOn(Image.prototype, 'stage');
			commitSpy.mockClear();
			
			// @ts-ignore
			image = new Image(Promise.resolve('mock-id'), null);
			
			image.commit('test');
			commitStream.emit('end', null);
		});
		it('should should execute image.stage', () => {
			expect(stageSpy).toBeCalledTimes(1);
		});

		it('should call builder.commit', async () => {
			expect(commitSpy).toBeCalledTimes(1);

			const expectedRequest = new CommitRequest();

			expectedRequest.setContainer(await image['container']);
			expectedRequest.setTag('test');

			expect(commitSpy).toBeCalledWith(expectedRequest);
		});
	});
});
