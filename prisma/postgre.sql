-- Inital SQL Table Creation v3
-- Simple Key/Value internal store

CREATE TABLE public.config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
);
CREATE TABLE public.members (
    id VARCHAR(100) NOT NULL,
    username TEXT NOT NULL,
    displayName TEXT,
    rulesConfirmedOn timestamptz,
    points integer NOT NULL DEFAULT 0,
    lastGrantedPoint timestamp NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);
CREATE TABLE public.twitch (
    id VARCHAR(100) PRIMARY KEY,
    memberID VARCHAR(100) UNIQUE NOT NULL,
    username TEXT NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id) ON DELETE CASCADE
);
CREATE TABLE public.modlog (
    id SERIAL PRIMARY KEY,
    targetID VARCHAR(100),
    moderatorID VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    timestamp timestamptz NOT NULL DEFAULT NOW(),
    metadata JSON,
    CONSTRAINT FK_targetID FOREIGN KEY(targetID) REFERENCES public.members(id) ON DELETE CASCADE,
    CONSTRAINT FK_moderatorID FOREIGN KEY(moderatorID) REFERENCES public.members(id) ON DELETE CASCADE
);