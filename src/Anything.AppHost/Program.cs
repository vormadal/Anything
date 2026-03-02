var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder
    .AddPostgres("anything-postgres")
    .WithPgAdmin(containerName: "anything-pgadmin")
    .WithDataVolume(isReadOnly: false)
    .AddDatabase("anything");

var minio = builder
    .AddMinio("minio")
    .WithDataVolume()
    .WithMinioConsole();

var minioBucket = minio.AddBucket("recipe-images");

// Imaginary: open-source image processing proxy (https://github.com/h2non/imaginary)
// Fetches source images from MinIO via HTTP; no credentials needed since bucket is public-read.
// Production: set MINIO_SOURCE_ENDPOINT and IMAGINARY_BASE_URL in CapRover env vars.
var imaginary = builder
    .AddContainer("imaginary", "h2non/imaginary", "latest")
    .WithHttpEndpoint(targetPort: 8088, name: "http")
    .WithArgs("-enable-url-source");

var api = builder
    .AddProject<Projects.Anything_API>("anything-api", launchProfileName: "http")
    .WithReference(postgres)
    .WithReference(minio)
    .WithEnvironment("ImageSettings__BucketName", "recipe-images")
    .WithEnvironment("ImageSettings__AccessKey", "minioadmin")
    .WithEnvironment("ImageSettings__SecretKey", "minioadmin")
    .WithEnvironment("ImageSettings__Endpoint", "http://minio:9000")
    // MinioSourceEndpoint: the MinIO URL as seen from Imaginary's Docker network
    .WithEnvironment("ImageSettings__MinioSourceEndpoint", "http://minio:9000")
    // ImaginaryBaseUrl: injected from Aspire's endpoint reference at runtime
    .WithEnvironment("ImageSettings__ImaginaryBaseUrl", imaginary.GetEndpoint("http"))
    .WaitFor(postgres)
    .WaitFor(minioBucket);

builder.AddJavaScriptApp("anything-frontend", "../../anything-frontend", "dev")
    .WithHttpEndpoint(port: 3001, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(api);

await builder.Build().RunAsync();
