package chat

import (
	"time"
)

const (
	maxBacklogHours = 168 // Keep backlog max hours worth of messages (Villa Bota: one week)
)

func (s *Service) setupPersistence() {
	chatDataPruner := time.NewTicker(5 * time.Minute)
	go func() {
		s.runPruner()
		for range chatDataPruner.C {
			s.runPruner()
		}
	}()
}
