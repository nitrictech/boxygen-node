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

import { DEFAULT_LOGGER } from "./logger";

describe("DEFAULT_LOGGER", () => {
  let logSpy: jest.SpyInstance = null;
  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockClear();
  });

  afterAll(() => {
    logSpy.mockReset();
  });

  describe("when calling the default logger with a n strings", () => {
    beforeEach(() => {
      DEFAULT_LOGGER(["one", "two", "three"]);
    });

		it("should call console.log n times", () => {
			expect(logSpy).toBeCalledTimes(3);
		});

		it("should call console.log with each of the strings", () => {
			expect(logSpy.mock.calls[0]).toEqual(["one"]);
			expect(logSpy.mock.calls[1]).toEqual(["two"]);
			expect(logSpy.mock.calls[2]).toEqual(["three"]);
		});
  });
});
