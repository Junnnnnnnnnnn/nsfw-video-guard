# NSFW Video Guard

## Overview

This project is a NestJS-based service for analyzing videos for NSFW (Not Safe For Work) content, specifically 'sexy' and 'nude' classifications. It uses TensorFlow.js with GPU acceleration to process video frames efficiently. The entire application is containerized with Docker for easy setup and deployment.

## Prerequisites

- Docker
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) for GPU acceleration.

## Running the Server with Docker

The project includes a `Dockerfile` and `docker-compose.yaml` for building and running the service in a container.

1.  **Build and Run the Container:**
    Open a terminal in the project root directory and run the following command:

    ```bash
    docker-compose up --build -d
    ```

    - `docker-compose up`: Starts the services defined in the `docker-compose.yaml` file.
    - `--build`: Builds the Docker image before starting the container. Use this when you have made changes to the source code.
    - `-d`: Runs the container in detached mode (in the background).

2.  **Verify:**
    Once the command completes, the server will be running and accessible on port `3000` of your local machine.

## Usage

A simple HTML client is provided to test the analysis service.

1.  **Open the Client:**
    Open the `nsfw-video-guard-client.html` file in a web browser (e.g., Chrome, Firefox).

2.  **Upload and Analyze:**
    - The `Endpoint` field should be pre-filled with the server address: `http://localhost:3000/nsfw/analyze-upload`.
    - Click **Choose File** to select a video file you want to analyze.
    - Click the **Upload & Start Analysis** button.

3.  **View Results:**
    - A progress bar will show the file upload status.
    - After the upload is complete, the server will begin processing the video. The status will update to "Processing on server...".
    - Once the analysis is finished, the results for "Sexy" and "Nude" probabilities will be displayed in the **Analysis Result** section.

---

## Troubleshooting

### Missing TensorFlow DLL file on Local Development

When running the server in a local, non-Docker environment (e.g., with `npm run start:local`), you may encounter an error related to a missing `.dll` file for the `@tensorflow/tfjs-node` library, particularly with these versions:

```json
{
  "@tensorflow/tfjs": "^4.22.0",
  "@tensorflow/tfjs-node": "^4.22.0",
  "@tensorflow/tfjs-node-gpu": "^4.22.0"
}
```

**Symptom:** An error message indicating that `tfjs-node.dll` or a similar file cannot be found, often referencing a path like `.../node_modules/@tensorflow/tfjs-node/lib/napi-v8/`.

**Solution:**
This can happen if the Node.js ABI version of your project does not match the pre-compiled version provided by TensorFlow. A common workaround is to copy the `.dll` file from a different ABI version directory to the one your system is looking for.

For example, if the file is missing in the `napi-v8` directory, you can copy it from `napi-v9`:

1.  Navigate to `node_modules/@tensorflow/tfjs-node/lib/`.
2.  Copy the `.dll` file from a directory like `napi-v9`.
3.  Paste the file into the `napi-v8` directory (the one mentioned in the error message).
4.  Try running the build/start command again.