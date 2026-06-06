// Command webconsole is the WebConsole backend: a Gin server exposing the game
// library REST API plus Range-capable static serving for ROMs and cover art.
package main

import (
	"flag"
	"log"

	"webconsole/internal/config"
	"webconsole/internal/repository"
	"webconsole/internal/router"
	"webconsole/internal/seed"
	"webconsole/internal/storage"
)

func main() {
	configPath := flag.String("config", "config.yaml", "path to config file")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	db, err := storage.Open(cfg)
	if err != nil {
		log.Fatalf("open storage: %v", err)
	}

	// Seed the demo library from bundled test ROMs (idempotent).
	if err := seed.Run(cfg, repository.NewGameRepository(db)); err != nil {
		log.Fatalf("seed: %v", err)
	}

	r := router.New(cfg, db)

	log.Printf("WebConsole backend listening on %s", cfg.Addr)
	if err := r.Run(cfg.Addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}
