package entity

// User entity represents the core business object in Clean Code Architecture.
// - This struct is part of the Domain Layer (Enterprise Business Rules).
// - It contains only business data and rules, with no dependencies on frameworks or databases.
// - This separation makes the code reusable, testable, and independent of infrastructure changes.
// - Follows the Entity pattern: a simple, framework-agnostic data structure.

import "time"

// User holds all relevant user profile information.
type User struct {
	ID         uint      `gorm:"primaryKey;autoIncrement"`
	Username   string    `gorm:"type:varchar(100);not null"`
	FirstName  string    `gorm:"type:varchar(100)"`
	LastName   string    `gorm:"type:varchar(100)"`
	Email      string    `gorm:"type:varchar(100);unique;not null"`
	Phone      string    `gorm:"type:varchar(20)"`
	Address    string    `gorm:"type:varchar(255)"`
	Password   string    `gorm:"type:varchar(255);not null"`
	ProfilePic string    `gorm:"type:varchar(255)"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
}
