# Boxygen Node.js SDK

Build container images with Javascript and Typescript!

```typescript
import { Workspace } from "@nitric/boxygen";

// Start a new workspace
Workspace.start(async (workspace) => {
	// Build a hello world image
	await workspace
		// start FROM alpine
		.image('alpine')
		// Set entrypoint and command
		.config({
			entrypoint: ['echo'],
			cmd: ['hello world!']
		})
		// Commit out image with a tag of hello-world
		.commit('hello-world');
});
```

## Prerequisites
* Node.js 12+
* Docker (support for podman is definetely possible)

## Examples

## 

<!--## Why containers as code?

### Why not just use Dockerfile/Containerfile templates

### What about buildpacks?

### What about buildah?-->
