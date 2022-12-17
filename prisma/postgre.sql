-- Inital SQL Table Creation
CREATE TABLE public.members (
    id VARCHAR(100) NOT NULL,
    tag TEXT NOT NULL,
    rulesConfirmedOn timestamptz,
    PRIMARY KEY ("id")
);
CREATE TABLE public.twitch (
    memberID VARCHAR(100) PRIMARY KEY,
    twitchID VARCHAR(100),
    username TEXT NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id)
);
CREATE TABLE public.economy (
    memberID VARCHAR(100) PRIMARY KEY,
    points integer NOT NULL DEFAULT 0,
    lastGrantedPoint timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_memberID FOREIGN KEY(memberID) REFERENCES public.members(id)
);