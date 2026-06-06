// Package repository contains the GORM-backed data-access layer.
package repository

import (
	"errors"

	"gorm.io/gorm"

	"webconsole/internal/model"
)

// ErrNotFound is returned when a requested record does not exist.
var ErrNotFound = errors.New("not found")

// GameQuery describes a filtered, paginated game listing request.
type GameQuery struct {
	Platform string
	Search   string
	Tag      string
	Sort     string // "name" | "recent" | "playCount"
	Page     int    // 1-based
	PageSize int
}

// GameRepository provides access to Game records.
type GameRepository struct{ db *gorm.DB }

// NewGameRepository constructs a GameRepository.
func NewGameRepository(db *gorm.DB) *GameRepository { return &GameRepository{db: db} }

// PlatformCount is the number of games on a given platform.
type PlatformCount struct {
	Platform string `json:"platform"`
	Count    int64  `json:"count"`
}

// List returns games matching q plus the total count (before pagination).
func (r *GameRepository) List(q GameQuery) ([]model.Game, int64, error) {
	tx := r.db.Model(&model.Game{})

	if q.Platform != "" {
		tx = tx.Where("platform = ?", q.Platform)
	}
	if q.Search != "" {
		like := "%" + q.Search + "%"
		tx = tx.Where("name LIKE ? OR name_cn LIKE ?", like, like)
	}
	if q.Tag != "" {
		tx = tx.Where("tags LIKE ?", "%\""+q.Tag+"\"%")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	switch q.Sort {
	case "playCount":
		tx = tx.Order("play_count DESC")
	case "recent":
		tx = tx.Order("updated_at DESC")
	default:
		tx = tx.Order("name ASC")
	}

	if q.PageSize > 0 {
		page := q.Page
		if page < 1 {
			page = 1
		}
		tx = tx.Offset((page - 1) * q.PageSize).Limit(q.PageSize)
	}

	var games []model.Game
	if err := tx.Find(&games).Error; err != nil {
		return nil, 0, err
	}
	return games, total, nil
}

// Get returns a single game by ID, or ErrNotFound.
func (r *GameRepository) Get(id string) (model.Game, error) {
	var g model.Game
	err := r.db.First(&g, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return g, ErrNotFound
	}
	return g, err
}

// PlatformCounts returns the number of games per platform.
func (r *GameRepository) PlatformCounts() ([]PlatformCount, error) {
	var counts []PlatformCount
	err := r.db.Model(&model.Game{}).
		Select("platform, count(*) as count").
		Group("platform").
		Order("platform ASC").
		Scan(&counts).Error
	return counts, err
}

// Tags returns the distinct set of tags across all games. Tags are stored as a
// JSON array string per game; callers parse the raw strings.
func (r *GameRepository) RawTags() ([]string, error) {
	var raws []string
	err := r.db.Model(&model.Game{}).
		Where("tags != '' AND tags IS NOT NULL").
		Pluck("tags", &raws).Error
	return raws, err
}

// Create inserts a new game.
func (r *GameRepository) Create(g *model.Game) error { return r.db.Create(g).Error }

// Update persists changes to an existing game.
func (r *GameRepository) Update(g *model.Game) error { return r.db.Save(g).Error }

// ExistsByRomPath reports whether a game with the given ROM path already exists.
// Used by the seeder to stay idempotent.
func (r *GameRepository) ExistsByRomPath(romPath string) (bool, error) {
	var count int64
	err := r.db.Model(&model.Game{}).Where("rom_path = ?", romPath).Count(&count).Error
	return count > 0, err
}

// IncrementPlayCount bumps the play counter for a game.
func (r *GameRepository) IncrementPlayCount(id string) error {
	return r.db.Model(&model.Game{}).Where("id = ?", id).
		UpdateColumn("play_count", gorm.Expr("play_count + 1")).Error
}

// ByIDs returns the games matching the given IDs (order not guaranteed).
func (r *GameRepository) ByIDs(ids []string) ([]model.Game, error) {
	if len(ids) == 0 {
		return []model.Game{}, nil
	}
	var games []model.Game
	err := r.db.Where("id IN ?", ids).Find(&games).Error
	return games, err
}

// TopPlayed returns up to limit games with the highest play counts (>0).
func (r *GameRepository) TopPlayed(limit int) ([]model.Game, error) {
	var games []model.Game
	err := r.db.Where("play_count > 0").
		Order("play_count DESC").
		Limit(limit).
		Find(&games).Error
	return games, err
}
