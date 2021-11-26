// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import execa from 'execa';
import { BOXYGEN_IMAGE, DEFAULT_VERSION, Workspace } from './workspace';
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
			expect(commandSyncSpy).toBeCalledWith(`docker pull ${BOXYGEN_IMAGE}:${DEFAULT_VERSION}`);
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