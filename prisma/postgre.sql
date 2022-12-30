-- Inital SQL Table Creation
-- On delete cascade is used in-case a user request a data removal
CREATE TABLE public.members (
    id VARCHAR(100) NOT NULL,
    tag TEXT NOT NULL,
    rulesConfirmedOn timestamptz,
    PRIMARY KEY ("id")
);
CREATE TABLE public.twitch (
    id VARCHAR(100) PRIMARY KEY,
    memberID VARCHAR(100) UNIQUE NOT NULL,
    username TEXT NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id) ON DELETE CASCADE
);
CREATE TABLE public.economy (
    memberID VARCHAR(100) PRIMARY KEY,
    points integer NOT NULL DEFAULT 0,
    lastGrantedPoint timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id) ON DELETE CASCADE
);
CREATE TABLE public.modlog (
    id SERIAL PRIMARY KEY,
    memberID VARCHAR(100) NOT NULL,
    moderatorID VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    timestamp timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id),
    CONSTRAINT FK_moderatorID FOREIGN KEY(moderatorID) REFERENCES public.members(id)
);