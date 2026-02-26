var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder
    .AddPostgres("anything-postgres")
    .WithPgAdmin(containerName: "anything-pgadmin")
    .WithDataVolume(isReadOnly: false)
    .AddDatabase("anything");

var api = builder
    .AddProject<Projects.Anything_API>("anything-api", launchProfileName: "http")
    .WithReference(postgres)
    .WaitFor(postgres);

builder.AddJavaScriptApp("anything-frontend", "../../anything-frontend", "dev")
    .WithHttpEndpoint(port: 3001, env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(api);

await builder.Build().RunAsync();
