var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume();

postgres.AddDatabase("postgres");

builder.Build().Run();
