// Package storage wires up the SQLite database and ensures the runtime data
// directories exist.
package storage

import (
	"fmt"
	"os"

	"github.com/glebarez/sqlite" // pure-Go SQLite driver (modernc.org/sqlite under the hood)
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"webconsole/internal/config"
	"webconsole/internal/model"
)

// Open opens (creating if needed) the SQLite database, runs AutoMigrate for all
// models, and ensures roms/, covers/ and saves/ directories exist.
func Open(cfg config.Config) (*gorm.DB, error) {
	for _, dir := range []string{cfg.RomsDir(), cfg.CoversDir(), cfg.SavesDir()} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("mkdir %q: %w", dir, err)
		}
	}

	gormCfg := &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)}
	db, err := gorm.Open(sqlite.Open(cfg.DatabasePath()), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("open sqlite %q: %w", cfg.DatabasePath(), err)
	}

	if err := db.AutoMigrate(&model.Game{}, &model.SaveState{}, &model.PlayHistory{}); err != nil {
		return nil, fmt.Errorf("automigrate: %w", err)
	}
	return db, nil
}
