// Package config loads WebConsole's runtime configuration from a YAML file,
// applying sensible defaults so the server can boot with zero setup.
package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config holds all runtime settings for the backend.
type Config struct {
	Addr               string `yaml:"addr"`
	DataDir            string `yaml:"dataDir"`
	TestRomsDir        string `yaml:"testRomsDir"`
	EmulatorjsDataPath string `yaml:"emulatorjsDataPath"`
	GinMode            string `yaml:"ginMode"`
}

// defaults returns a Config pre-populated with reasonable values.
func defaults() Config {
	return Config{
		Addr:               ":8080",
		DataDir:            "../data",
		TestRomsDir:        "../test-roms",
		EmulatorjsDataPath: "https://cdn.emulatorjs.org/stable/data/",
		GinMode:            "debug",
	}
}

// Load reads configuration from path. A missing file is not an error: the
// defaults are returned instead. Any present fields override the defaults.
func Load(path string) (Config, error) {
	cfg := defaults()

	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, fmt.Errorf("read config %q: %w", path, err)
	}

	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		return cfg, fmt.Errorf("parse config %q: %w", path, err)
	}
	return cfg, nil
}

// RomsDir returns the directory that holds ROM files, grouped by platform.
func (c Config) RomsDir() string { return filepath.Join(c.DataDir, "roms") }

// CoversDir returns the directory that holds cover art.
func (c Config) CoversDir() string { return filepath.Join(c.DataDir, "covers") }

// SavesDir returns the directory that holds save-state binaries and screenshots.
func (c Config) SavesDir() string { return filepath.Join(c.DataDir, "saves") }

// DatabasePath returns the SQLite database file path.
func (c Config) DatabasePath() string { return filepath.Join(c.DataDir, "webconsole.db") }
