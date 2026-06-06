// Package model defines the GORM-backed domain entities persisted in SQLite.
package model

import "time"

// LocalUserID is the fixed single-user identity. WebConsole has no login flow;
// every write is attributed to this user. Multi-user support is out of scope.
const LocalUserID = "local"

// Game is a single playable title in the library.
type Game struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	Name        string    `json:"name"`
	NameCn      string    `json:"nameCn"`
	Platform    string    `gorm:"index" json:"platform"` // nes/snes/gb/gbc/gba
	Core        string    `json:"core"`                  // EmulatorJS EJS_core
	Description string    `json:"description"`
	CoverPath   string    `json:"cover"`
	RomPath     string    `json:"-"`
	BiosPath    string    `json:"-"`
	FileSize    int64     `json:"fileSize"`
	PlayCount   int64     `json:"playCount"`
	Tags        string    `json:"tags"` // JSON array string
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// SaveState is one save-state slot for a game (binary state + screenshot).
type SaveState struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	GameID     string    `gorm:"index" json:"gameId"`
	UserID     string    `gorm:"index" json:"userId"` // fixed "local"
	Slot       int       `json:"slot"`
	StatePath  string    `json:"-"`
	Screenshot string    `json:"screenshot"`
	SizeBytes  int64     `json:"sizeBytes"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// PlayHistory tracks recency and accumulated play time per game.
type PlayHistory struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	GameID       string    `gorm:"index" json:"gameId"`
	UserID       string    `gorm:"index" json:"userId"` // fixed "local"
	LastPlayedAt time.Time `json:"lastPlayedAt"`
	PlaySeconds  int64     `json:"playSeconds"`
}
