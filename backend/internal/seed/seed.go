// Package seed populates the library. It (1) copies the bundled NESDev
// public-domain test ROMs in with curated metadata, then (2) scans the runtime
// roms directory so any ROM the operator drops into data/roms/<platform>/ is
// auto-registered with the correct EmulatorJS core. It is idempotent.
package seed

import (
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"webconsole/internal/config"
	"webconsole/internal/model"
	"webconsole/internal/repository"
)

// platformExts maps each supported platform directory to its EmulatorJS core
// and the ROM file extensions that belong to it. GB and GBC share the `gb` core,
// so .gbc files live under the gb/ directory.
type platformDef struct {
	core string
	exts []string
}

var platforms = map[string]platformDef{
	"nes":  {core: "nes", exts: []string{".nes"}},
	"snes": {core: "snes", exts: []string{".smc", ".sfc"}},
	"gba":  {core: "gba", exts: []string{".gba"}},
	"gb":   {core: "gb", exts: []string{".gb", ".gbc"}},
}

// seedGame describes one bundled test ROM to import with nice metadata.
type seedGame struct {
	id     string
	file   string
	name   string
	nameCn string
	tags   string
}

// testRoms are the NESDev public-domain test ROMs shipped in test-roms/.
var testRoms = []seedGame{
	{"nestest", "nestest.nes", "nestest", "NES CPU 测试", `["测试","CPU"]`},
	{"01-basics", "01-basics.nes", "01-basics", "指令测试 (basics)", `["测试","指令"]`},
	{"cpu_dummy_reads", "cpu_dummy_reads.nes", "cpu_dummy_reads", "CPU 虚读测试", `["测试","CPU"]`},
	{"palette", "palette.nes", "palette", "调色板测试", `["测试","PPU"]`},
}

// Run imports the bundled test ROMs and then scans for operator-supplied ROMs.
func Run(cfg config.Config, repo *repository.GameRepository) error {
	if err := importTestRoms(cfg, repo); err != nil {
		return err
	}
	return scanRoms(cfg, repo)
}

// importTestRoms copies the bundled NES test ROMs into data/roms/nes and
// registers them with curated metadata.
func importTestRoms(cfg config.Config, repo *repository.GameRepository) error {
	destDir := filepath.Join(cfg.RomsDir(), "nes")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return fmt.Errorf("mkdir %q: %w", destDir, err)
	}

	for _, sg := range testRoms {
		// Dedup by primary key (ID): idempotent across restarts and resilient to
		// a pre-existing DB whose stored rom_path uses a different OS separator
		// (e.g. a Windows-created data dir mounted into a Linux container).
		if _, err := repo.Get(sg.id); err == nil {
			continue
		} else if !errors.Is(err, repository.ErrNotFound) {
			return err
		}

		src := filepath.Join(cfg.TestRomsDir, sg.file)
		dest := filepath.Join(destDir, sg.file)

		size, err := copyFile(src, dest)
		if err != nil {
			fmt.Printf("seed: skipping %s: %v\n", sg.file, err)
			continue
		}

		now := time.Now()
		g := &model.Game{
			ID:          sg.id,
			Name:        sg.name,
			NameCn:      sg.nameCn,
			Platform:    "nes",
			Core:        "nes",
			Description: "NESDev public-domain test ROM.",
			RomPath:     dest,
			FileSize:    size,
			Tags:        sg.tags,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := repo.Create(g); err != nil {
			return fmt.Errorf("create game %q: %w", sg.id, err)
		}
		fmt.Printf("seed: imported test ROM %s (%d bytes)\n", sg.file, size)
	}
	return nil
}

// scanRoms walks data/roms/<platform>/ and registers any ROM file not already
// in the database, deriving metadata from the filename.
func scanRoms(cfg config.Config, repo *repository.GameRepository) error {
	// Filenames owned by importTestRoms (curated metadata) — never re-register
	// them here, or they'd duplicate the fixed-id rows.
	testRomFiles := make(map[string]struct{}, len(testRoms))
	for _, sg := range testRoms {
		testRomFiles[sg.file] = struct{}{}
	}

	for platform, def := range platforms {
		dir := filepath.Join(cfg.RomsDir(), platform)
		entries, err := os.ReadDir(dir)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return fmt.Errorf("read dir %q: %w", dir, err)
		}

		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(entry.Name()))
			if !contains(def.exts, ext) {
				continue
			}
			if _, isTestRom := testRomFiles[entry.Name()]; isTestRom {
				continue // owned by importTestRoms
			}

			romPath := filepath.Join(dir, entry.Name())

			// Stable id from platform + filename (NOT the absolute path), so the
			// same ROM keeps one id across OSes / data dirs and re-scans dedup
			// by primary key — no duplicates when an existing DB is reused.
			id := platform + "-" + shortHash(platform+"/"+entry.Name())
			if _, err := repo.Get(id); err == nil {
				continue
			} else if !errors.Is(err, repository.ErrNotFound) {
				return err
			}

			info, err := entry.Info()
			if err != nil {
				continue
			}
			name := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
			now := time.Now()
			g := &model.Game{
				ID:        id,
				Name:      name,
				NameCn:    name,
				Platform:  platform,
				Core:      def.core,
				RomPath:   romPath,
				FileSize:  info.Size(),
				Tags:      "[]",
				CreatedAt: now,
				UpdatedAt: now,
			}
			if err := repo.Create(g); err != nil {
				return fmt.Errorf("create game %q: %w", g.ID, err)
			}
			fmt.Printf("seed: scanned %s/%s -> core %s\n", platform, entry.Name(), def.core)
		}
	}
	return nil
}

// contains reports whether s is in list.
func contains(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}

// shortHash returns a short stable id derived from a path.
func shortHash(s string) string {
	sum := sha1.Sum([]byte(s))
	return hex.EncodeToString(sum[:])[:10]
}

// copyFile copies src to dest, returning the number of bytes written.
func copyFile(src, dest string) (int64, error) {
	in, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer in.Close()

	out, err := os.Create(dest)
	if err != nil {
		return 0, err
	}
	defer out.Close()

	return io.Copy(out, in)
}
