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
